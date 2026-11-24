// Closed vocabulary: never emit raw stdout/stderr, URLs, keys, or SQL.
export function commandDiagnostic(output, { code, signal, timedOut, missing } = {}) {
  const rules = [
    ['DOCKER_VOLUME_OR_CONTAINER', /(?:failed to (?:create|remove) (?:a )?(?:volume|container)|volume.*already exists|container name.*already in use)/i],
    ['STARTUP_PRECONDITION', /(?:database is not healthy|service is not healthy|failed to initialize|not initialized|failed to connect to docker|cannot connect to the Docker daemon)/i],
    ['IMAGE_PULL_FAILED', /(?:failed to pull|error pulling|pull access denied|manifest unknown|no matching manifest|toomanyrequests|failed to resolve reference)/i],
    ['PORT_CONFLICT', /(?:port is already allocated|address already in use|bind:.*already in use)/i],
    ['DISK_EXHAUSTED', /no space left on device/i],
    ['DNS_OR_NETWORK', /(?:no such host|network is unreachable|temporary failure in name resolution|i\/o timeout|connection refused|context deadline exceeded|TLS handshake timeout)/i],
    ['CONTAINER_HEALTH', /(?:unhealthy|health check (?:failed|timed out)|failed to (?:start|inspect) container|container.*(?:exited|not running))/i],
    ['INVALID_CONFIG', /(?:failed to (?:parse|load) config|unknown (?:flag|field)|invalid configuration|cannot unmarshal)/i],
    ['MIGRATION_SQL', /(?:SQLSTATE\s*[:=]?\s*[0-9A-Z]{5}|failed to apply migration|error applying migration|ERROR:\s)/i],
    ['EDGE_RUNTIME', /(?:edge runtime.*(?:failed|error)|failed to (?:bundle|serve) function)/i],
  ];
  const categories = rules.filter(([, re]) => re.test(output)).map(([name]) => name);
  const sqlState = output.match(/\bSQLSTATE\s*[:=]?\s*([0-9A-Z]{5})\b/i)?.[1]?.toUpperCase() ?? null;
  // The public artifact can show only fixed infrastructure vocabulary, not arbitrary error text.
  // Select the final diagnostic lines and retain known words in their original order.
  const vocabulary = new Set('error failed failure cannot could unable invalid unsupported required missing unknown denied refused timeout canceled cancelled exhausted unavailable unhealthy docker daemon container containers image images registry network port address bind listen localhost health check database postgres postgresql supabase cli start startup starting started initialization initialize config configuration parse version major analytics logflare vector storage kong auth gotrue edge runtime pull pulling download resolve manifest architecture platform permission disk memory space connection connect reset terminated process exit code not found already exists running internal bridge endpoint migration seed service services certificate tls socket context deadline exceeded'.split(' '));
  const terminal = output.split(/\r?\n/).filter(line => /(?:error|fail|cannot|unable|invalid|unsupported|denied|timeout|unhealthy|missing|exit|not found)/i.test(line)).slice(-4);
  const terminalVocabulary = terminal.map(line => (line.toLowerCase().match(/[a-z]+/g) ?? []).filter(word => vocabulary.has(word)).slice(0, 20).join(' ')).filter(Boolean);
  return { terminalVocabulary, exitCode: Number.isInteger(code) ? code : null, signal: ['SIGTERM','SIGKILL','SIGINT'].includes(signal) ? signal : null,
    categories: [...new Set([...(timedOut ? ['COMMAND_TIMEOUT'] : []), ...(missing ? ['COMMAND_MISSING'] : []), ...categories, ...(!timedOut && !missing && !categories.length ? ['UNCLASSIFIED'] : [])])], sqlState };
}
