#!/usr/bin/env bash
set -euo pipefail
# Independently boot the official self-hosted core; no Supabase CLI or hosted project.
# Pinned upstream Compose snapshot retaining PostgreSQL 15. No application secrets.
root="$PWD"
work="$(mktemp -d)"
project="preciso-core-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
network="${project}-internal"
evidence="$root/test-results/disposable-core"
mkdir -p "$evidence"
chmod 700 "$work"
stage=prepare
cleanup=NOT_VERIFIED
replayed=0
deferred=0
applied_deferred=0
failure_file=NONE
sqlstate=NONE
outcome=FAIL
dc=(docker compose --project-name "$project" --file "$work/core.json")
finish() {
  rc=$?
  trap - EXIT
  docker rm -fv "$project-probe" >/dev/null 2>&1 || true
  if [ -f "$work/core.json" ]; then
    "${dc[@]}" down --volumes --remove-orphans >"$work/cleanup.log" 2>&1 || rc=1
  fi
  if docker info >/dev/null 2>&1 && containers="$(docker ps -aq --filter "label=com.docker.compose.project=$project")" && volumes="$(docker volume ls -q --filter "label=com.docker.compose.project=$project")" && networks="$(docker network ls -q --filter "name=^$network$")" && probes="$(docker ps -aq --filter "name=^/$project-probe$")" && test -z "$containers$volumes$networks$probes" && rm -rf -- "$work" && test ! -e "$work"; then
    cleanup=PASS
  else
    cleanup=FAIL
    rc=1
  fi
  if [ "$rc" != 0 ]; then outcome=FAIL; fi
  printf '{"scope":"REAL_CORE_WITHOUT_EDGE","commitSha":"%s","stage":"%s","replayMode":"QA_DEPENDENCY_ORDER","migrationsReplayed":%s,"deferredStatements":%s,"appliedDeferredStatements":%s,"failedMigration":"%s","sqlState":"%s","core":"%s","cleanup":"%s","fullIntegration":"NOT_EXECUTED","productionApproval":false}\n' "$GITHUB_SHA" "$stage" "$replayed" "$deferred" "$applied_deferred" "$failure_file" "$sqlstate" "$outcome" "$cleanup" > "$evidence/summary.json"
  cat "$evidence/summary.json"
  exit "$rc"
}
trap finish EXIT
upstream=30e78d59c0b3e1c55259d7e4767797c0ebb3df26
base="https://raw.githubusercontent.com/supabase/supabase/$upstream/docker"
for f in docker-compose.yml .env.example volumes/db/realtime.sql volumes/db/webhooks.sql volumes/db/roles.sql volumes/db/jwt.sql volumes/db/_supabase.sql volumes/db/logs.sql volumes/db/pooler.sql; do
  mkdir -p "$work/$(dirname "$f")"
  curl --fail --silent --show-error --location --max-time 60 "$base/$f" -o "$work/$f"
done
mkdir -p "$work/volumes/db/data" "$work/volumes/storage"
# Generate new credentials, never import repository .env or secrets.
python3 - "$work" "$project" <<'PY'
import sys, pathlib, secrets, time, json, base64, hashlib, hmac, re
p=pathlib.Path(sys.argv[1])
values={}
for line in (p/'.env.example').read_text().splitlines():
    m=re.match(r'^([A-Z][A-Z_0-9]*)=(.*)$',line)
    if m: values[m[1]]=m[2]
secret=secrets.token_hex(32)
def b64(v): return base64.urlsafe_b64encode(v).rstrip(b'=').decode()
def jwt(role):
    body=b64(b'{"alg":"HS256","typ":"JWT"}')+'.'+b64(json.dumps(dict(role=role,iss='supabase',iat=int(time.time()),exp=int(time.time())+3600),separators=(',',':')).encode())
    return body+'.'+b64(hmac.new(secret.encode(),body.encode(),hashlib.sha256).digest())
values.update(POSTGRES_PASSWORD=secrets.token_hex(24), JWT_SECRET=secret, ANON_KEY=jwt('anon'), SERVICE_ROLE_KEY=jwt('service_role'), POSTGRES_HOST='db', POSTGRES_PORT='5432', POSTGRES_DB='postgres', API_EXTERNAL_URL='http://auth:9999', SUPABASE_PUBLIC_URL='http://storage:5000', SITE_URL='http://127.0.0.1', ADDITIONAL_REDIRECT_URLS='', DISABLE_SIGNUP='false', ENABLE_EMAIL_SIGNUP='true', ENABLE_EMAIL_AUTOCONFIRM='true', ENABLE_PHONE_SIGNUP='false', ENABLE_ANONYMOUS_USERS='false', SMTP_HOST='localhost', SMTP_PORT='1025', SMTP_USER='', SMTP_PASS='', JWT_JWKS='', JWT_KEYS='', SUPABASE_PUBLISHABLE_KEY='', SUPABASE_SECRET_KEY='', ANON_KEY_ASYMMETRIC='', SERVICE_ROLE_KEY_ASYMMETRIC='', S3_PROTOCOL_ACCESS_KEY_ID=secrets.token_hex(12),S3_PROTOCOL_ACCESS_KEY_SECRET=secrets.token_hex(24))
(p/'.env').write_text(''.join(f'{k}={v}\n' for k,v in values.items()))
(p/'probe.env').write_text(''.join(f'{k}={values[k]}\n' for k in ['POSTGRES_PASSWORD','ANON_KEY','SERVICE_ROLE_KEY']))
PY
stage=compose-config
# Resolve the upstream definitions, then keep only the required real services.
(cd "$work"; env -i PATH="$PATH" HOME="$HOME" docker compose --env-file .env -f docker-compose.yml config --format json > all.json 2>config.log)
python3 - "$work" "$network" <<'PY'
import sys,json,pathlib
p=pathlib.Path(sys.argv[1]); network=sys.argv[2]
c=json.loads((p/'all.json').read_text())
allowed={'db','auth','rest','storage','imgproxy'}
services={k:v for k,v in c['services'].items() if k in allowed}
assert set(services)==allowed
assert services['db']['image']=='supabase/postgres:15.8.1.085'
for k,v in services.items():
    for key in ('container_name','ports','expose','restart'): v.pop(key,None)
    v['networks']={'default':{}}
    v['depends_on']={d:opts for d,opts in v.get('depends_on',{}).items() if d in allowed}
    assert not v.get('privileged') and not v.get('network_mode')
    for vol in v.get('volumes',[]):
        if vol.get('type')=='bind':
            assert pathlib.Path(vol['source']).resolve().is_relative_to(p.resolve())
        else: assert vol.get('source')=='db-config'
# Own named volumes, not root-owned bind-mounted data directories.
vols={'db-config':{'name':network+'-db-config'}}
for service,target,key in [('db','/var/lib/postgresql/data','pg-data'),('storage','/var/lib/storage','storage-data'),('imgproxy','/var/lib/storage','storage-data')]:
    matches=[v for v in services[service]['volumes'] if v.get('target')==target]
    assert len(matches)==1 and matches[0]['type']=='bind'
    v=matches[0]
    v['type']='volume'
    v['source']=key
    v.pop('bind',None)
    vols[key]={'name':network+'-'+key}
(p/'core.json').write_text(json.dumps({'services':services,'networks':{'default':{'name':network,'internal':True}},'volumes':vols}))
PY
stage=pull-images
"${dc[@]}" pull > "$work/pull.log" 2>&1
docker pull node:22-bookworm-slim > "$work/node-pull.log" 2>&1
node_image="$(docker image inspect --format '{{.Id}}' node:22-bookworm-slim)"
stage=boot-core
"${dc[@]}" up -d --wait --wait-timeout 180 > "$work/up.log" 2>&1
test "$(docker network inspect --format '{{.Internal}}' "$network")" = true
for service in db auth rest storage imgproxy; do
  cid="$("${dc[@]}" ps -q "$service")"
  test -n "$cid"
  docker inspect "$cid" | python3 -c 'import sys,json; d=json.load(sys.stdin)[0]; assert not d["HostConfig"]["PortBindings"]; assert set(d["NetworkSettings"]["Networks"]) == {sys.argv[1]}; assert d["State"]["Running"]' "$network"
done
# Diagnostic-only pass: inspect the entire original history once, without
# inventing objects, granting permissions, or treating cascading errors as fixes.
if [[ "${DISPOSABLE_REPLAY_DIAGNOSTIC:-0}" == 1 ]]; then
  stage=history-diagnostic
  python3 - "$root/supabase/migrations" "$evidence" "$work" "$project" <<'PY'
import pathlib, sys, subprocess, re, json, collections, hashlib
src,evidence,work=map(pathlib.Path,sys.argv[1:4]); project=sys.argv[4]
files=sorted(src.glob('*.sql'))
assert len(files)==528
cmd=['docker','compose','--project-name',project,'--file',str(work/'core.json'),'exec','-T','db','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','--single-transaction']
rows=[]
first_failure=None
for f in files:
    assert re.fullmatch(r'[0-9]{14}_[A-Za-z0-9_-]+\.sql',f.name)
    data=f.read_bytes()
    # All data is generated locally. Never emit raw SQL or stderr.
    r=subprocess.run(cmd,input=data,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=120)
    row={'migration':f.name,'gitBlobSha':hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest(),'result':'PASS' if r.returncode==0 else 'FAIL','afterPriorFailure':first_failure is not None}
    if r.returncode:
        err=r.stderr.decode('utf-8','replace')
        m=re.search(r'ERROR:\s*([0-9A-Z]{5}):',err)
        row['sqlState']=m.group(1) if m else 'UNCLASSIFIED'
        # Only a simple object identifier already present in this source file,
        # never a value, query, error detail or arbitrary message.
        m=re.search(r'ERROR:\s*[0-9A-Z]{5}:\s*(?:column|relation|type|schema) "([A-Za-z_][A-Za-z_0-9.]*)" (?:of relation "[A-Za-z_][A-Za-z_0-9.]*" )?does not exist',err)
        if m and re.search(r'(?<![A-Za-z_0-9])'+re.escape(m.group(1))+r'(?![A-Za-z_0-9])',data.decode('utf-8','replace'),re.I):
            row['missingIdentifier']=m.group(1)
        # Infrastructure or session loss cannot be interpreted as SQL history errors.
        if row['sqlState']=='UNCLASSIFIED' or row['sqlState'].startswith(('08','58')):
            rows.append(row)
            break
        if first_failure is None: first_failure=f.name
    rows.append(row)
    if len(rows)%50==0: print(f'Diagnostic: {len(rows)}/{len(files)} files attempted',flush=True)
failed=[r for r in rows if r['result']=='FAIL']
report={'scope':'DIAGNOSTIC_ONLY','replayMode':'ORIGINAL_CHRONOLOGICAL_CONTINUE_ON_SQL_ERROR','expected':len(files),'attempted':len(rows),'passed':len(rows)-len(failed),'failed':len(failed),'firstFailure':first_failure,'sqlStateCounts':dict(collections.Counter(r['sqlState'] for r in failed)),'completeInventory':len(rows)==len(files),'integrationCertified':False,'productionApproval':False,'rows':rows}
(evidence/'history-diagnostic.json').write_text(json.dumps(report,indent=2))
print(json.dumps({k:v for k,v in report.items() if k!='rows'}))
# Never approve integration based on a best-effort history pass.
PY
  exit 1
fi
stage=real-migrations
# QA-only dependency-order reconciliation. Exact historical blobs are verified;
# no repository migration is edited, skipped wholesale or certified as chronological.
early=20260401092855_151a7e98-30e0-4d58-ba85-1b072b6c656e.sql
expand=20260409225549_7915042f-0f37-4f3e-aa52-d6c1917ffa7a.sql
harden=20260410215419_01cf2709-8d77-42a5-a7dc-d526bf4fb028.sql
model=20260412063808_9923c009-eb9a-4445-bcba-9738b999867e.sql
model_harden=20260412063825_6eb83ec5-c8ee-4004-bc2f-06d646252bda.sql
python3 - "$root/supabase/migrations" "$work" <<'PY'
import sys,pathlib,hashlib
src=pathlib.Path(sys.argv[1]); dst=pathlib.Path(sys.argv[2])
known={
'20260401092855_151a7e98-30e0-4d58-ba85-1b072b6c656e.sql':'dddaded557ca59b9d5dbc719511cae94b4a50257',
'20260409225549_7915042f-0f37-4f3e-aa52-d6c1917ffa7a.sql':'79a1ea021e0df64d389c1a0d6621e344a33d0e73',
'20260410215419_01cf2709-8d77-42a5-a7dc-d526bf4fb028.sql':'ca8a6513be5d557d3441a9ba8a9d4103fd754271',
'20260412063808_9923c009-eb9a-4445-bcba-9738b999867e.sql':'2d9ba6d63256481e75172441b2766641806d9816',
'20260412063825_6eb83ec5-c8ee-4004-bc2f-06d646252bda.sql':'55c3def746dc6f4a6bab9448081497d34e7fc32f'}
for name, expected in known.items():
    b=(src/name).read_bytes()
    actual=hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
    assert actual==expected, 'historical dependency file changed'
for name in list(known)[:2]:
    original=(src/name).read_text()
    marker='CREATE OR REPLACE VIEW public.account_limits_view AS'
    assert original.count(marker)==1
    a,b=original.split(marker)
    assert b.strip().endswith(';') and b.count(';')==1
    (dst/(name+'.body')).write_text(a)
    (dst/(name+'.deferred')).write_text(marker+b)
name=list(known)[2]
original=(src/name).read_text()
lines=['ALTER VIEW IF EXISTS public.account_model_view SET (security_invoker = true);','ALTER VIEW IF EXISTS public.account_limits_view SET (security_invoker = true);']
for line in lines: assert original.count(line)==1
(dst/(name+'.body')).write_text(''.join(line for line in original.splitlines(keepends=True) if line.strip() not in lines))
(dst/(name+'.deferred')).write_text('\n'.join(lines)+'\n')
PY
apply_file() {
  local file="$1" label="$2"
  if ! "${dc[@]}" exec -T db psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --single-transaction < "$file" > "$work/replay.log" 2>&1; then
    failure_file="$label"
    sqlstate="$(sed -nE 's/.*ERROR: *([0-9A-Z]{5}):.*/\1/p' "$work/replay.log" | tail -1)"
    [[ "$sqlstate" =~ ^[0-9A-Z]{5}$ ]] || sqlstate=NONE
    exit 1
  fi
}
for file in "$root"/supabase/migrations/*.sql; do
  name="$(basename "$file")"
  [[ "$name" =~ ^[0-9]{14}_[A-Za-z0-9_-]+\.sql$ ]]
  case "$name" in
    "$early"|"$expand") apply_file "$work/$name.body" "$name"; deferred=$((deferred+1));;
    "$harden") apply_file "$work/$name.body" "$name"; deferred=$((deferred+2));;
    *) apply_file "$file" "$name";;
  esac
  replayed=$((replayed+1))
  if [[ "$name" == "$model" ]]; then
    # Both historical definitions are executable now. Reapply the exact
    # deferred hardening before any application-level verification.
    test "$deferred" = 4
    cat "$work/$early.deferred" "$work/$expand.deferred" "$work/$harden.deferred" > "$work/account-views.sql"
    apply_file "$work/account-views.sql" "$model"
    applied_deferred=4
    actual="$("${dc[@]}" exec -T db psql -X -U postgres -d postgres -At -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('account_model_view','account_limits_view') AND c.reloptions @> ARRAY['security_invoker=true'];")"
    test "$actual" = 2
  fi
done
test "$deferred" = 4 && test "$applied_deferred" = 4
test "$replayed" -gt 0
# Existing check creates synthetic accounts itself; no legacy or production seed imported.
"${dc[@]}" restart rest > "$work/restart-rest.log" 2>&1
probe() {
  docker run --rm --name "$project-probe" --network "$network" --env-file "$work/probe.env"     --mount "type=bind,source=$root,target=/app,readonly" --mount "type=bind,source=$evidence,target=/evidence"     --workdir /app "$node_image" node scripts/security/disposable-core-probe.mjs "$1"
}
stage=baseline
probe baseline
stage=candidate-sql
"${dc[@]}" exec -T db psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 --single-transaction < "$root/docs/security/local-fixes/related-flows.sql" > "$work/candidate.log" 2>&1
stage=candidate
probe candidate
stage=complete-core
outcome=PASS
