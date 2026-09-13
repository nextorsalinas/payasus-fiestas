'use client';
import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CLOWNS,
  INFLATABLES,
  SERVICE_LABELS,
  localDate,
  normalizeReservation,
  overlaps,
  previousDate,
  resourceStatus,
  validTimeRange,
  type Reservation,
} from '@/lib/availability';

export function AvailabilityDialog({
  open,
  onOpenChange,
  eventDate,
  eventStart,
  eventEnd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventDate: string;
  eventStart: string;
  eventEnd: string;
}) {
  const [date, setDate] = useState(eventDate || localDate());
  const [start, setStart] = useState(eventStart);
  const [end, setEnd] = useState(eventEnd);
  const [agency, setAgency] = useState('all');
  const [service, setService] = useState('all');
  const [records, setRecords] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverConfirmed, setServerConfirmed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    // Include the prior day for events crossing midnight and the next day for overnight searches.
    const next = new Date(`${date}T12:00:00`);
    next.setDate(next.getDate() + 1);
    const q = query(
      collection(db, 'contrataciones'),
      where('date', '>=', previousDate(date)),
      where('date', '<=', localDate(next)),
    );
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        setRecords(
          snapshot.docs.map((doc) => normalizeReservation(doc.id, doc.data())),
        );
        setServerConfirmed(!snapshot.metadata.fromCache);
        setLoading(false);
      },
      (failure) => {
        setLoading(false);
        setRecords([]);
        setServerConfirmed(false);
        setError(
          failure.code === 'permission-denied'
            ? 'No se pudo acceder a la agenda compartida. Consulta con la administración.'
            : 'No pudimos consultar la agenda. Revisa la conexión y vuelve a intentar.',
        );
      },
    );
  }, [open, date, retry]);
  const rangeValid = validTimeRange(start, end);
  const matching = useMemo(
    () =>
      rangeValid
        ? records
            .filter((r) => overlaps(r, date, start, end))
            .sort(
              (a, b) =>
                a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
            )
        : [],
    [records, date, start, end, rangeValid],
  );
  const shown = matching.filter(
    (r) =>
      (agency === 'all' || r.agency === agency) &&
      (service === 'all' || r.services.includes(service)),
  );
  const ready = !loading && !error && serverConfirmed && rangeValid && !!date;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl p-5 sm:p-6">
        <DialogHeader className="pr-7">
          <DialogTitle className="flex items-center gap-2 text-xl font-black">
            <CalendarDays /> Disponibilidad compartida
          </DialogTitle>
          <DialogDescription>
            Reservas de Pispifiestas y Payasus Fiestas. La agenda se actualiza
            cuando se guarda una contratación.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-bold">
            Fecha
            <input
              className="field-control"
              type="date"
              value={date}
              onChange={(e) => {
                setServerConfirmed(false);
                setRecords([]);
                setError('');
                setLoading(!!e.target.value);
                setDate(e.target.value);
              }}
            />
          </label>
          <label className="text-sm font-bold">
            Desde
            <input
              className="field-control"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="text-sm font-bold">
            Hasta
            <input
              className="field-control"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <p>
            Sin horario se consulta el día completo. Si termina antes de
            iniciar, cruza a la madrugada siguiente.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setStart('');
              setEnd('');
            }}
          >
            Todo el día
          </Button>
        </div>
        {!rangeValid && (
          <p role="alert" className="text-amber-800">
            Completa ambos horarios con horas distintas o selecciona “Todo el
            día”.
          </p>
        )}
        {loading && <output>Consultando reservas de ambas agencias…</output>}
        {!loading && !error && !serverConfirmed && (
          <output className="rounded-lg bg-amber-50 p-3 text-amber-900">
            Esperando confirmación del servidor. No se puede confirmar
            disponibilidad con datos sin conexión.
          </output>
        )}
        {ready && (
          <>
            <div className="rounded-xl border bg-slate-50 p-4">
              <h3 className="font-bold">
                Recursos en el horario consultado · ambas agencias
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                “Sin reservas” significa que no hay una contratación registrada
                en ese horario. No bloquea el recurso ni incluye tiempo de
                traslado.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['inflable', 'Inflables', INFLATABLES],
                    ['animador', 'Payasos', CLOWNS],
                  ] as const
                ).map(([key, title, options]) => (
                  <div key={key}>
                    <h4 className="mb-2 text-sm font-bold">{title}</h4>
                    <ul className="space-y-2">
                      {options.map((option) => {
                        const status = resourceStatus(matching, key, option);
                        return (
                          <li
                            key={option}
                            className="flex justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm"
                          >
                            <span>{option}</span>
                            <span
                              className={
                                status === 'ocupado'
                                  ? 'font-bold text-rose-700'
                                  : status === 'por-confirmar'
                                    ? 'font-bold text-amber-800'
                                    : 'font-bold text-green-800'
                              }
                            >
                              {status === 'ocupado'
                                ? 'Ocupado'
                                : status === 'por-confirmar'
                                  ? 'Por confirmar'
                                  : 'Sin reservas'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Filtrar lista por agencia
                <select
                  value={agency}
                  onChange={(e) => setAgency(e.target.value)}
                  className="field-control"
                >
                  <option value="all">Ambas agencias</option>
                  <option>Pispifiestas</option>
                  <option>Payasus Fiestas</option>
                </select>
              </label>
              <label className="text-sm font-bold">
                Filtrar lista por servicio
                <select
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="field-control"
                >
                  <option value="all">Todos los servicios</option>
                  {Object.entries(SERVICE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <h3 className="font-bold">Servicios agendados ({shown.length})</h3>
            {shown.length === 0 ? (
              <p className="rounded-lg border p-4 text-sm">
                No hay contrataciones para estos filtros.
              </p>
            ) : (
              <ul className="space-y-3">
                {shown.map((r) => (
                  <li key={r.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap justify-between gap-2">
                      <span className="font-bold">{r.agency}</span>
                      <span className="text-xs text-slate-500">{r.folio}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold">
                      {r.date} ·{' '}
                      {r.start && r.end
                        ? `${r.start} a ${r.end}${r.end < r.start ? ' (día siguiente)' : ''}`
                        : 'Horario por confirmar'}
                    </p>
                    <p className="mt-2 text-sm">
                      {r.services
                        .map((key) => SERVICE_LABELS[key] || key)
                        .join(' · ')}
                    </p>
                    {r.services.includes('inflable') && (
                      <p className="mt-1 text-sm">
                        Inflables:{' '}
                        {r.inflatableModels.join(', ') ||
                          'Sin asignar; confirmar con la agencia'}
                      </p>
                    )}
                    {r.services.includes('animador') && (
                      <p className="mt-1 text-sm">
                        Payasos:{' '}
                        {r.clownNames.join(', ') ||
                          'Sin asignar; confirmar con la agencia'}
                      </p>
                    )}
                    {r.services.includes('cosplay') && (
                      <p className="mt-1 text-sm">
                        Cosplay:{' '}
                        {r.cosplayCharacter || 'Personaje por confirmar'}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-slate-500">
              Pintacaritas y cosplay muestran sus contrataciones; la
              disponibilidad del personal debe confirmarse. Las reservas
              antiguas sin recurso asignado requieren revisión.
            </p>
          </>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
            <Button
              type="button"
              variant="outline"
              className="mt-2"
              onClick={() => {
                setError('');
                setLoading(true);
                setServerConfirmed(false);
                setRetry((r) => r + 1);
              }}
            >
              <RefreshCw size={14} /> Reintentar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
