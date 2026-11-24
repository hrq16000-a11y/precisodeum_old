// Local tooling only. Never import this module into application/Worker code.
export function assertLoopback(value, protocols = ['http:']) {
  const url = new URL(value);
  if (!protocols.includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error('NON_LOCAL_TARGET');
  }
  return url;
}

export function isolatedEnvironment(environment) {
  return Object.fromEntries(Object.entries(environment).filter(([key]) =>
    !/^(PG|SUPABASE_|VITE_SUPABASE_|DATABASE_URL$|DOCKER_HOST$|DOCKER_CONTEXT$)/.test(key)
  ));
}

export function migrationHint(output) {
  // Only a known filename, never SQL, credentials, row values, or raw logs.
  return [...output.matchAll(/Applying migration ([0-9]{14}_[a-zA-Z0-9_-]+\.sql)/g)].at(-1)?.[1] ?? null;
}