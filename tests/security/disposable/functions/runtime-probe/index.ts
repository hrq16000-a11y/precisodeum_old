// Disposable runtime liveness only. No imports, network calls, notifications or production deployment.
Deno.serve((request: Request) => new Response(JSON.stringify({
  ok: true,
  mocked: true,
  synthetic: true,
  method: request.method,
}), { headers: { 'Content-Type': 'application/json' } }));