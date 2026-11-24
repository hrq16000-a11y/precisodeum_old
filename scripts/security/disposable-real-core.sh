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
  if docker info >/dev/null 2>&1 &&      test -z "$(docker ps -aq --filter "label=com.docker.compose.project=$project")" &&      test -z "$(docker volume ls -q --filter "label=com.docker.compose.project=$project")" &&      test -z "$(docker network ls -q --filter "name=^$network$")" &&      ! docker container inspect "$project-probe" >/dev/null 2>&1; then
    cleanup=PASS
  else
    cleanup=FAIL
    rc=1
  fi
  if [ "$rc" != 0 ]; then outcome=FAIL; fi
  printf '{"scope":"REAL_CORE_WITHOUT_EDGE","commitSha":"%s","stage":"%s","migrationsReplayed":%s,"failedMigration":"%s","sqlState":"%s","core":"%s","cleanup":"%s","fullIntegration":"NOT_EXECUTED","productionApproval":false}\n' "$GITHUB_SHA" "$stage" "$replayed" "$failure_file" "$sqlstate" "$outcome" "$cleanup" > "$evidence/summary.json"
  cat "$evidence/summary.json"
  rm -rf "$work"
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
vols={'db-config':{'name':network+'-db-config'}}
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
stage=real-migrations
# Replay each unchanged migration in order; raw DB output stays in the temporary workspace.
for file in "$root"/supabase/migrations/*.sql; do
  name="$(basename "$file")"
  [[ "$name" =~ ^[0-9]{14}_[A-Za-z0-9_-]+\.sql$ ]]
  if ! "${dc[@]}" exec -T db psql -X -U postgres -d postgres -v ON_ERROR_STOP=1 -v VERBOSITY=verbose --single-transaction < "$file" > "$work/replay.log" 2>&1; then
    failure_file="$name"
    sqlstate="$(sed -nE 's/.*ERROR: *([0-9A-Z]{5}):.*/\1/p' "$work/replay.log" | tail -1)"
    [[ "$sqlstate" =~ ^[0-9A-Z]{5}$ ]] || sqlstate=NONE
    exit 1
  fi
  replayed=$((replayed+1))
done
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
