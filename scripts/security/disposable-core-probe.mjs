// QA-only client: isolated network, explicit routing; no hosted Supabase target.
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const [kind] = process.argv.slice(2);
assert.ok(['baseline','candidate'].includes(kind));
const routes = { '/auth/v1/': ['auth',9999], '/rest/v1/': ['rest',3000], '/storage/v1/': ['storage',5000] };
const api = http.createServer((req,res) => {
  const path = req.url ?? '';
  const prefix = Object.keys(routes).find(p => path.startsWith(p));
  if (!prefix) { res.writeHead(404); res.end(); return; }
  const [hostname,port] = routes[prefix];
  const headers = {...req.headers, host: hostname+':'+port};
  const upstream = http.request({hostname,port,path:'/'+path.slice(prefix.length),method:req.method,headers}, reply=>{
    res.writeHead(reply.statusCode ?? 502,reply.headers);reply.pipe(res);
  });
  upstream.on('error',()=>{res.writeHead(502);res.end();});
  req.pipe(upstream);
});
const pg = net.createServer(socket=>{
  const upstream=net.connect(5432,'db');
  socket.pipe(upstream);upstream.pipe(socket);
  socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());
});
const listen = (server,port) => new Promise((ok,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',ok);});
const ready = async () => {
  for(let i=0;i<30;i++){
    try{
      const auth=await fetch('http://127.0.0.1:54321/auth/v1/health');
      const rest=await fetch('http://127.0.0.1:54321/rest/v1/', {headers:{Authorization:'Bearer '+process.env.ANON_KEY,apikey:process.env.ANON_KEY}});
      const storage=await fetch('http://127.0.0.1:54321/storage/v1/status');
      if(auth.ok && rest.ok && storage.ok)return;
    }catch{}
    await new Promise(ok=>setTimeout(ok,1000));
  }
  throw new Error('CORE_SERVICES_NOT_READY');
};
try {
  await listen(api,54321);await listen(pg,54322);
  await ready();
  const status='/tmp/preciso-synthetic-status.json', output='/evidence/'+kind+'.json';
  writeFileSync(status, JSON.stringify({API_URL:'http://127.0.0.1:54321',DB_URL:'postgresql://postgres:'+encodeURIComponent(process.env.POSTGRES_PASSWORD)+'@127.0.0.1:54322/postgres',ANON_KEY:process.env.ANON_KEY,SERVICE_ROLE_KEY:process.env.SERVICE_ROLE_KEY}),{mode:0o600});
  const code=await new Promise((ok,fail)=>{
    const child=spawn(process.execPath,[resolve('tests/security/disposable/verify-stack.mjs'),status,output,'--core-only'],{stdio:'ignore'});
    child.once('error',fail);child.once('close',ok);
  });
  const evidence=JSON.parse(readFileSync(output,'utf8'));
  console.log(JSON.stringify(evidence));
  if(code!==0 || evidence.coreComplete!==true || evidence.complete!==false)process.exitCode=1;
} catch { console.error('CORE_PROBE_FAILED');process.exitCode=1; }
finally { api.closeAllConnections();api.close();pg.close(); }
