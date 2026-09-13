export const INFLATABLES = ['Castillo', 'Resbaladilla', 'Princesas'] as const;
export const CLOWNS = ['Copelito', 'Tetoneto', 'Pekas', 'Maggy'] as const;
export const SERVICE_LABELS: Record<string, string> = {
  inflable: 'Inflables',
  pintacaritas: 'Pintacaritas',
  animador: 'Payasos',
  cosplay: 'Cosplay',
};
export type Reservation = {
  id: string;
  date: string;
  start: string;
  end: string;
  services: string[];
  inflatableModels: string[];
  clownNames: string[];
  cosplayCharacter: string;
  agency: string;
  folio: string;
  status: string;
};
const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
const text = (value: unknown) => (typeof value === 'string' ? value : '');
export function normalizeReservation(
  id: string,
  data: Record<string, unknown>,
): Reservation {
  const brand = text(data.marca).toLowerCase();
  const payasus =
    brand === 'payasus' ||
    brand === 'payasusfiestas' ||
    data.sourceProject === 'payasus-fiestas';
  return {
    id,
    date: text(data.date),
    start: text(data.start),
    end: text(data.end),
    services: strings(data.services),
    inflatableModels: strings(data.inflatableModels),
    clownNames: strings(data.clownNames),
    cosplayCharacter: text(data.cosplayCharacter),
    agency: payasus ? 'Payasus Fiestas' : 'Pispifiestas',
    folio:
      text(data.folio) ||
      `${payasus ? 'PAY' : 'PIS'}-${id
        .replace(/^payasus_/, '')
        .slice(0, 8)
        .toUpperCase()}`,
    status: text(data.status),
  };
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function previousDate(date: string): string {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() - 1);
  return localDate(value);
}
function minutes(time: string): number | null {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}
const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 60000;
export function reservationWindow(r: Reservation): [number, number] {
  const day = dayNumber(r.date),
    start = minutes(r.start),
    end = minutes(r.end);
  if (start === null || end === null || start === end) return [day, day + 1440];
  return [day + start, day + end + (end < start ? 1440 : 0)];
}
export function overlaps(
  r: Reservation,
  date: string,
  start = '',
  end = '',
): boolean {
  if (
    ['cancelada', 'cancelado', 'cancelled', 'canceled'].includes(
      r.status.toLowerCase(),
    )
  )
    return false;
  const a = reservationWindow(r),
    b = reservationWindow({ ...r, date, start, end });
  return a[0] < b[1] && b[0] < a[1];
}
export const validTimeRange = (start: string, end: string) =>
  (!start && !end) ||
  (minutes(start) !== null && minutes(end) !== null && start !== end);
const canonical = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
export function resourceStatus(
  reservations: Reservation[],
  service: 'inflable' | 'animador',
  resource: string,
): 'ocupado' | 'por-confirmar' | 'sin-reservas' {
  const matching = reservations.filter((r) => r.services.includes(service));
  const assigned = (r: Reservation) =>
    service === 'inflable' ? r.inflatableModels : r.clownNames;
  if (
    matching.some((r) =>
      assigned(r).some((name) => canonical(name) === canonical(resource)),
    )
  )
    return 'ocupado';
  const catalog: readonly string[] =
    service === 'inflable' ? INFLATABLES : CLOWNS;
  if (
    matching.some(
      (r) =>
        assigned(r).length === 0 ||
        assigned(r).some(
          (name) =>
            !catalog.some((option) => canonical(option) === canonical(name)),
        ),
    )
  )
    return 'por-confirmar';
  return 'sin-reservas';
}
