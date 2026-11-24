# AGENTS.md — precisodeum_old

Diretrizes incrementais de referência visual e qualidade. Antes de editar código, consultar README e documentação já existente; GitHub é o registro de alterações.

## Referências externas para design e interação (17/11/2026)

- TasteSkill (https://www.tasteskill.dev/): método de revisão de direção visual, tipografia, espaçamento e composição autoral, nunca template a copiar.
- Transitions.dev (https://transitions.dev/): fonte de microinterações CSS quando houver interface web; `prefers-reduced-motion`, teclado, foco e contraste obrigatórios.
- React Bits (https://reactbits.dev/): considerar componentes React gratuitos individualmente, após revisão de licença MIT + Commons Clause, dependências, SSR (se houver) e bundle; sem Pro não licenciado.
- RiseClub (https://riseclub.tech/): observar organização de aprendizagem/comunidade e conteúdo editorial; jamais copiar conteúdo, interface, marcas ou dados.
- Escopo local: Repositório de legado: preservar SEO, histórico, rotas e integrações; só aplicar melhoria visual em mudança comprovadamente necessária e sem deploy automático.
- Adoção apenas quando resolver necessidade real: branch/PR pequeno, verificação responsiva 390/1440 (para web), motion reduzido, sem mudanças em banco, DNS, credenciais, funis ou produção decorrentes deste documento.
- Não executar instaladores/skills/scripts externos automaticamente. Preservar instruções mais específicas, licenças e testes do projeto.

## Security homologation

- Run destructive function checks only in a disposable local database with synthetic fixtures; stubbed function tests do not certify application, trigger, or RLS integration.
- Keep unapplied local database corrections in docs/security/local-fixes until deployment is authorized; do not modify applied migration history.
- Sponsor review/cancellation and identity resolution lock pending rows and commit audit records atomically; incomplete audit reads must never enable detailed exports or certify restoration.
- Restoration success requires explicit complete evidence from the current run; skipped checks, partial inventories, and dry runs never certify completion.
- Identity apply/dismiss audit metadata records field and suggestion identifiers, not old/new values or source text, so audit provenance does not duplicate sensitive identity data.
- Health success requires a complete current read and confirmed history persistence; recovery notifications follow the history write so unavailable evidence cannot certify recovery.
