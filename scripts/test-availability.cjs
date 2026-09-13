const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const moduleShim = { exports: {} };
new Function(
  'module',
  'exports',
  ts.transpileModule(readFileSync('lib/availability.ts', 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
)(moduleShim, moduleShim.exports);
const {
  normalizeReservation,
  overlaps,
  resourceStatus,
  validTimeRange,
  previousDate,
} = moduleShim.exports;
const booking = (data = {}) =>
  normalizeReservation('example', {
    date: '2026-09-20',
    start: '14:00',
    end: '17:00',
    services: ['inflable'],
    inflatableModels: ['Castillo'],
    status: 'confirmada',
    ...data,
  });
test('includes both agencies and normalizes legacy records', () => {
  assert.equal(booking().agency, 'Pispifiestas');
  assert.equal(booking({ marca: 'payasus' }).agency, 'Payasus Fiestas');
  assert.equal(booking({ clownNames: null }).clownNames.length, 0);
});
test('time overlap includes nested ranges but excludes adjacent bookings', () => {
  const r = booking();
  assert.equal(overlaps(r, r.date, '15:00', '16:00'), true);
  assert.equal(overlaps(r, r.date, '12:00', '14:00'), false);
  assert.equal(overlaps(r, r.date, '17:00', '18:00'), false);
  assert.equal(overlaps(r, r.date), true);
});
test('overnight reservations block the following morning', () => {
  const r = booking({ start: '23:00', end: '02:00' });
  assert.equal(overlaps(r, '2026-09-21', '01:00', '03:00'), true);
  assert.equal(overlaps(r, '2026-09-21', '02:00', '03:00'), false);
  assert.equal(
    overlaps(
      booking({ date: '2026-09-21', start: '01:00', end: '03:00' }),
      '2026-09-20',
      '23:00',
      '02:00',
    ),
    true,
  );
});
test('missing legacy hours remain occupied all day; cancellations do not', () => {
  assert.equal(
    overlaps(booking({ start: '', end: '' }), '2026-09-20', '20:00', '21:00'),
    true,
  );
  assert.equal(overlaps(booking({ status: 'cancelada' }), '2026-09-20'), false);
});
test('generic and unknown legacy resource assignments never imply availability', () => {
  assert.equal(
    resourceStatus(
      [booking({ inflatableModels: [] })],
      'inflable',
      'Princesas',
    ),
    'por-confirmar',
  );
  assert.equal(
    resourceStatus(
      [booking({ inflatableModels: ['Otro'] })],
      'inflable',
      'Castillo',
    ),
    'por-confirmar',
  );
  assert.equal(resourceStatus([booking()], 'inflable', 'Castillo'), 'ocupado');
  assert.equal(
    resourceStatus([booking()], 'inflable', 'Princesas'),
    'sin-reservas',
  );
  assert.equal(
    resourceStatus(
      [booking({ services: ['animador'], clownNames: ['pekas'] })],
      'animador',
      'Pekas',
    ),
    'ocupado',
  );
});
test('validates complete time ranges and month boundaries', () => {
  assert.equal(validTimeRange('', ''), true);
  assert.equal(validTimeRange('14:00', ''), false);
  assert.equal(validTimeRange('14:00', '14:00'), false);
  assert.equal(validTimeRange('23:00', '02:00'), true);
  assert.equal(previousDate('2026-10-01'), '2026-09-30');
});
