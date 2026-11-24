/**
 * Destinos que as ferramentas administrativas podem acessar: apenas os
 * endereços do próprio portal. Qualquer outro host é recusado.
 */
export const OWN_ORIGINS = [
  "https://www.precisodeum.com.br",
  "https://precisodeum.com.br",
  "https://precisodeum.lovable.app",
] as const;

export const OWN_GSC_PROPERTIES = [
  "https://www.precisodeum.com.br/",
  "https://precisodeum.com.br/",
  "sc-domain:precisodeum.com.br",
] as const;

/** Retorna a origem normalizada se for do portal; senão null. */
export function ownOrigin(input: string): string | null {
  try {
    const u = new URL(input);
    return (OWN_ORIGINS as readonly string[]).includes(u.origin) ? u.origin : null;
  } catch {
    return null;
  }
}

/** URL completa permitida somente se apontar para o portal. */
export function isOwnUrl(input: string): boolean {
  return ownOrigin(input) !== null;
}

export function isOwnGscProperty(site: string): boolean {
  return (OWN_GSC_PROPERTIES as readonly string[]).includes(site);
}

/** Rota relativa segura ("/x"), nunca "//host" ou URL absoluta. */
export function safeRoute(route: string): string | null {
  const r = route.startsWith("/") ? route : `/${route}`;
  if (r.startsWith("//") || /[\s\\]/.test(r) || /^\/[a-z]+:/i.test(r)) return null;
  return r;
}
