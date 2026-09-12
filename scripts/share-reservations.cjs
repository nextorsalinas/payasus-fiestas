const fs = require('node:fs');
const { getGlobalDefaultAccount } = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { getAccessToken } = require('firebase-tools/lib/apiv2');
const base = p => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;
async function request(url, options={}) {
  const token = await getAccessToken();
  const response = await fetch(url, {...options, headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
  const body = await response.json();
  if (!response.ok) throw new Error(`Firestore ${response.status}: ${body.error?.message || 'Request failed'}`);
  return body;
}
async function list(project) {
  const documents=[]; let pageToken;
  do {
    const url = new URL(`${base(project)}/contrataciones`);
    url.searchParams.set('pageSize','300');
    if(pageToken) url.searchParams.set('pageToken',pageToken);
    const result = await request(url);
    documents.push(...(result.documents || [])); pageToken=result.nextPageToken;
  } while(pageToken);
  return documents;
}
(async()=>{
  const account = getGlobalDefaultAccount();
  if(!account) throw new Error('Firebase login required');
  await requireAuth({project:'contrata-pispi',...account});
  if(process.argv[2] === 'rules') {
    const release=await request('https://firebaserules.googleapis.com/v1/projects/contrata-pispi/releases/cloud.firestore');
    const ruleset=await request(`https://firebaserules.googleapis.com/v1/${release.rulesetName}`);
    const actual=ruleset.source.files.map(f=>f.content).join('\n').replace(/\s+/g,'');
    const expected=fs.readFileSync('firestore.rules','utf8').replace(/\s+/g,'');
    if(actual!==expected) throw new Error('Las reglas publicadas difieren de la copia local; revisar antes de continuar.');
    console.log('Reglas compartidas verificadas: permiten los campos de contratación y marca, sin lectura pública.');
    return;
  }
  const source = await list('payasus-fiestas');
  const target = await list('contrata-pispi');
  console.log(JSON.stringify({payasus:source.length,pispi:target.length,mode:process.argv[2]||'audit'}));
  if(process.argv[2] !== 'migrate') return;
  fs.mkdirSync('.local-data',{recursive:true});
  fs.writeFileSync(`.local-data/reservas-${Date.now()}.json`,JSON.stringify({source,target}));
  let copied=0, skipped=0;
  for (const doc of source) {
    const id=doc.name.split('/').pop();
    const name=`projects/contrata-pispi/databases/(default)/documents/contrataciones/payasus_${id}`;
    const existing=target.find(d=>d.name===name);
    if(existing) {
      if(existing.fields?.sourceDocument?.stringValue!==doc.name) throw new Error('Conflicto de documento; migración detenida sin sobrescribir');
      skipped++; continue;
    }
    const fields={...doc.fields,marca:{stringValue:'payasus'},sourceProject:{stringValue:'payasus-fiestas'},sourceDocument:{stringValue:doc.name},folio:{stringValue:`PAY-${id.slice(0,8).toUpperCase()}`}};
    await request(`${base('contrata-pispi')}:commit`,{method:'POST',body:JSON.stringify({writes:[{update:{name,fields},currentDocument:{exists:false}}]})});
    copied++;
  }
  const verified=await list('contrata-pispi');
  for(const doc of source) {
    const id=doc.name.split('/').pop();
    const found=verified.find(d=>d.name.endsWith(`/payasus_${id}`));
    if(!found || found.fields?.sourceDocument?.stringValue!==doc.name) throw new Error('Verificación de migración fallida');
    for(const [key,value] of Object.entries(doc.fields||{})) {
      if(['marca','sourceProject','sourceDocument','folio'].includes(key)) continue;
      if(JSON.stringify(found.fields[key])!==JSON.stringify(value)) throw new Error(`Diferencia de datos en campo ${key}`);
    }
  }
  console.log(JSON.stringify({copied,skipped,totalShared:verified.length,verified:true,originalsRetained:true}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});

