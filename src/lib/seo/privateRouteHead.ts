/**
 * privateRouteHead — head() padrão para rotas privadas (painel do usuário e
 * área administrativa). Garante:
 *  - title único por rota (evita "sem título" em abas e no histórico)
 *  - description curta
 *  - robots noindex,nofollow (reforça o Disallow do robots.txt)
 */
export function privateRouteHead(title: string, description?: string) {
  const fullTitle = `${title} | Preciso de um Profissional`;
  const desc = description ?? `${title} — área privada da sua conta. Conteúdo não indexado.`;
  return {
    meta: [
      { title: fullTitle },
      { name: 'description', content: desc },
      { name: 'robots', content: 'noindex, nofollow' },
      { name: 'googlebot', content: 'noindex, nofollow' },
    ],
  };
}
