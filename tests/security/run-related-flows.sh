#!/usr/bin/env bash
set -euo pipefail
# Disposable synthetic DB only; never consumes project database credentials.
root="$(mktemp -d /tmp/related-flows-test.XXXXXX)"
port=55439
runner=()
if [ "$(id -u)" = 0 ]; then
  chown 1000:1000 "$root"
  runner=(setpriv --reuid=1000 --regid=1000 --clear-groups)
fi
cleanup() {
  "${runner[@]}" pg_ctl -D "$root/data" stop >/dev/null 2>&1 || true
  rm -rf "$root"
}
trap cleanup EXIT
"${runner[@]}" initdb -D "$root/data" -U lovable --auth=trust >"$root/init.log"
"${runner[@]}" pg_ctl -D "$root/data" -l "$root/server.log" -o "-k $root -p $port -h ''" start >/dev/null
psql -h "$root" -p "$port" -U lovable -d postgres -v ON_ERROR_STOP=1 \
  -f tests/security/round2-fixture.sql \
  -f docs/security/local-fixes/related-flows.sql \
  -f tests/security/round2-isolated.sql \
  -f tests/security/related-flows.sql