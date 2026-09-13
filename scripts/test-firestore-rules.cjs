const fs = require('node:fs');
const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { getAccessToken } = require('firebase-tools/lib/apiv2');
const path = '/databases/(default)/documents/contrataciones/example';
const cases = [];
function check(name,expectation,method,auth=null,extra={}) {cases.push({name,test:{expectation,request:{path,method,auth,...extra}}})}
check('beta public read allowed','ALLOW','get');
check('beta public list allowed','ALLOW','list');
check('public update denied','DENY','update');
check('public delete denied','DENY','delete');
check('private allowlist read denied','DENY','get',null,{path:'/databases/(default)/documents/calendarReaders/example'});
check('private allowlist write denied','DENY','create',null,{path:'/databases/(default)/documents/calendarReaders/example',resource:{data:{enabled:true}}});
const legacy = {
  name: 'Test',
  hostName: 'Test',
  phone: '0000000000',
  eventType: 'Test',
  date: '2026-09-20',
  location: 'Test',
  services: ['inflable'],
  accepted: true,
  status: 'confirmada',
  total: 100,
  deposit: 20,
  balance: 80,
};
check('Pispi create remains compatible', 'ALLOW', 'create', null, {
  resource: { data: legacy },
});
check('Payasus create stores schedule and folio', 'ALLOW', 'create', null, {
  resource: {
    data: {
      ...legacy,
      marca: 'payasus',
      sourceProject: 'payasus-fiestas',
      inflatableModels: ['Castillo'],
      clownNames: [],
      cosplayCharacter: '',
      start: '14:00',
      end: '17:00',
      folio: 'PAY-EXAMPLE',
    },
  },
});
(async () => {
  await requireAuth({
    project: 'contrata-pispi',
    ...getGlobalDefaultAccount(),
  });
  const token = await getAccessToken();
  const r = await fetch(
    'https://firebaserules.googleapis.com/v1/projects/contrata-pispi:test',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files: [
            {
              name: 'firestore.rules',
              content: fs.readFileSync('firestore.rules', 'utf8'),
            },
          ],
        },
        testSuite: { testCases: cases.map((c) => c.test) },
      }),
    },
  );
  const data = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(data));
  let failed = 0;
  data.testResults?.forEach((result, i) => {
    console.log(cases[i].name + ': ' + result.state);
    if (result.state !== 'SUCCESS') {
      failed++;
      console.log(JSON.stringify(result));
    }
  });
  if (data.issues?.length) console.log(JSON.stringify(data.issues));
  if (failed || data.testResults?.length !== cases.length) process.exitCode = 1;
})();
