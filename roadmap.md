# Roadmap — SEO, Moderação, Telemetria e Admin

## Roteiro 360° consolidado — Rodada 2A.1

- [x] 2A.3: conferir sincronização segura por leitura (2026-11-24). Local `main`/`f2775df7693b523eefa56439a66f8db7e25fb914`; remoto `main`/`01d64b3e2b03df0d88a15aa341413e2ff78fc895`; remoto é ancestral, 21 commits locais à frente e zero exclusivos remotos. Candidatos e HEAD local retornaram 422; workflow em `main`, 404. Git sync/configuração vinculada não acessível ao agente; nenhuma escrita remota nem conflito resolvido. Proprietário deve conferir destino, branch e status em Configurações do projeto → Git; não desconectar/reconectar.
- [x] 2A.1: complementar orquestrador existente com evidências por execução, estados NÃO EXECUTADO, limpeza por escopo e etapa final always; testar falhas parciais sem simular integração aprovada.
- [ ] 2A.2: executar o workflow existente em Linux/GitHub com Docker em `hrq16000-a11y/precisodeum_old` (destino confirmado pelo usuário em 2026-11-24). Bloqueio: sincronização do candidato `ac783cc7fbb4476869327201c2600f1567fa70ee`; API retornou 422 (No commit found), arquivo e workflow retornaram 404 em `main` (SHA remoto `01d64b3e2b03df0d88a15aa341413e2ff78fc895`). Nenhuma execução remota disparada; conferir Git sync na interface do projeto antes de executar o workflow.
- [ ] 2B: segurança funcional/auditoria de aprovação, sugestões e relatório; depende de baseline descartável completo. Depois: patrocinadores, campos administrativos, fotos, links privados, CSV, concorrência/atomicidade/persistência; não iniciar em paralelo agora.
- [ ] 2C: cadastro E2E mobile automatizado; depende de segurança funcional.
- [ ] 2D: publicar release de segurança com gates aprovados, autorização específica para banco real e correspondência commit/deployment; não depende de 5A/5B/5C, WhatsApp ou SEO.
- [ ] 3A: tracking e conversões; depende de modelo de eventos validado.
- [ ] 3B: WhatsApp oficial; depende de consentimento e autorização de integração.
- [ ] 4A: SEO regional e sitemap; depende de estrutura pública validada.
- [ ] 5A: Policy Lineage/contracts; primeiro verificar equivalentes de governança existentes; snapshots sanitizados versionados pelo CI (schema/RLS/grants/RPC/Storage/migration/SHA/data/origem), comparações e contratos vinculados a testes. Aceite: painel admin somente leitura, sem segredos/PII/edição de políticas/migrations automáticas ou funções privilegiadas no frontend; PASS/FAIL/NÃO TESTADO/INCOMPATIBILIDADE POTENCIAL distinguem evidência de declaração. `/admin/policy-lineage` é apenas sugestão, não nova rota nesta rodada.
- [ ] 5B: manutenção incremental de rotas TanStack Start existentes (não criar App.tsx nem substituir roteador); inventariar rotas/dependências/baseline, um domínio por vez, medir bundle e lazy loading real. Aceite: URLs, params/query strings, redirects, auth/guards/layouts/providers, permissões, SEO/404/links/navegação mobile/dashboards preservados, sem mudar negócio.
- [ ] 5C: medir índice de cidades antes de otimizar; já existe shell dinâmico `citiesIndex.ts` sobre `citiesIndexData.ts`, não reconstruir. Baseline bruto/comprimido, import chain/consumidores/bundle inicial/download/processamento/LCP/FCP/TBT/requisições. Avaliar dynamic por rota → JSON versionado → UF/região → busca sob demanda → endpoint existente → SSR compatível, sem requisição bloqueante ou nova infraestrutura. Aceite: comparação equivalente antes/depois, JS inicial e LCP medidos, cadastro/busca 390px/conexão lenta/fallback/SEO indexável/cidades/bairros/URLs/sitemap/canonicals/links preservados.
- [ ] 5D: Web Vitals por rota e versão; depende de telemetria validada, reutilizar ferramentas existentes.
- Imagens / Release B — proposta, não executada: primeiro confirmar ausência de conflitos e reaproveitar componentes/helpers existentes; tratar src vazio/inválido, erro e assinatura expirada com no máximo uma renovação autorizada, fallback `/placeholder.svg` uma vez e proteção contra falha do próprio placeholder. Sem logs de tokens, URLs temporárias permanentes, alterações de buckets/RLS ou bibliotecas pesadas. Preservar dimensões, LCP e imagens válidas; cover em avatares/fotos, contain em logos; testes sintéticos dos consumidores afetados em 390/768/1440px, incluindo renovação, fallback e ausência de loops. Release independente somente se não carregar segurança não homologada; sem publicação automática.
- Painel `/admin/homologacao` — proposta ligada a 5A/Policy Lineage, não implementar agora: verificar equivalentes antes de criar tela; reutilizar artefatos sanitizados do Actions somente por leitura (runs, SHA/branch/data/duração, etapas, dependências, limpeza, decisão, link original, comparação e filtros). Estados PENDENTE/EM EXECUÇÃO/PASS/FAIL/CANCELADO/NÃO EXECUTADO/SEM EVIDÊNCIA; sem tokens no frontend, logs sensíveis, execução arbitrária ou novos privilégios. Manter documentado até haver importação segura, sem duplicar sistema de testes.
- Melhorias administrativas preservadas sem reinício: gestão de anúncios, aprovação de patrocinadores, classificação de vagas, gestão de fotos, auditoria responsiva, impressões/cliques, conversões, Search Console e páginas de cidades/bairros; homologação populada permanece dependente dos gates acima.

## Roteiro 360° — Rodada 2A (2026-11-24)

- [x] Identificar ausência de Docker/socket e preparar alternativa no GitHub Actions com cópia temporária de migrations/seed, rede interna e cleanup; configuração validada com CLI 2.121.0.
- [x] Implementar verificações de Auth, persistência, RLS, RPC, Storage e runtime MOCK com usuários sintéticos; três testes de isolamento PASS e interrupção sem Docker confirmada.
- [x] Preparar aplicação isolada opcional do SQL candidato após baseline completo; relatório sanitizado registra etapa e último arquivo anunciado quando o replay falha.
- [ ] Executar integração completa no GitHub/Linux com Docker (bloqueio: Docker/socket e ferramenta para iniciar workflow remoto indisponíveis neste sandbox); nenhuma aprovação de negócio ou publicação certificada.
- Alertas identificados para 2B: `lov_finding_5c98e790929bfaee` permite publicação de prestador sem aprovação; `lov_finding_a637c991f2cfd872` refere-se a **agência**, não a um segundo alerta de prestador. Não tratados nesta rodada.
- Rodadas seguintes preservadas: 2B permissões/fotos/auditoria/CSV; 2C cadastro mobile automatizado; 2D publicação homologada; 3A tracking/painéis; 3B WhatsApp oficial desabilitado sem autorização; 4A SEO/GSC. Reaproveitar /admin/anuncios, /admin/aprovar-patrocinadores, classificação de vagas, Web Vitals, conversões e mocks existentes.

## Roteiro 360° — Rodada 1 (2026-11-24)

- [x] Ler o roteiro completo e reutilizar relatórios e scan existentes; nenhuma outra rodada iniciada.
- [x] Corrigir apenas injeção de código comprovada no PDF de contatos e validar com entradas sintéticas, sem alterar dados reais (4 testes + navegador 390/768/1440 PASS).
- [x] Entregar relatório com evidências, estados, migrations pendentes e limite de correspondência preview/produção; sem publicação, NO-GO mantido.

## Rodada 2B — escopo restrito (2026-11-24)

- [x] Ler novamente consumidores relacionados, sete funções atuais e agendamentos diretos; registrar conformidade e limites, sem ampliar correções.
- [x] Corrigir e testar localmente recusa de sugestões sem texto de origem na auditoria e avisos de saúde sem sucesso após falha de histórico (autorizado em 2026-11-24; sem publicação ou alteração de registros concluídos).
- [x] Reler consumidores e rotinas dos dois fluxos; registrar diagnósticos independentes afetados sem corrigir fora do escopo autorizado.
- Diagnósticos independentes: fora do escopo por decisão do usuário em 2026-11-24; manter intactos, sem tarefa de correção autorizada.
- [x] Identificar a terceira falha nos relatórios existentes: consulta detalhada de auditoria ambígua.
- [x] Conferir correções locais dos três defeitos e testar apenas a lacuna de privacidade na auditoria de sugestões (seis casos PASS).
- [x] Entregar tabela PASS/FAIL, IDs históricos disponíveis e leitura da versão pública, sem repetir testes visuais.
- [ ] Homologar em ambiente completo e comprovar SHA público (bloqueios: correções não implantadas, backend descartável completo e vínculo público com commit indisponíveis).

## Approved related-flow corrections (2026-11-24)

- [x] Sweep sponsor self-service/history, restoration UI/endpoint, offline reports, dashboard consumers, and direct scheduled jobs; correct remaining false-success/read failures locally.
- [x] Implement local sponsor review/cancellation and identity apply/dismiss corrections, preserving settled records, permissions, and settings.
- [x] Implement local detailed audit, incomplete exports, suggestion read errors, and health/restoration reporting corrections.
- [x] Run local function regressions and desktop/mobile checks; document limits in docs/security/local-fixes/README.md.
- [ ] Apply/deploy local corrections (blocked by the local-only development constraint; requires deployment authorization).
- [ ] Certify populated approval/application (blocked by empty shared queues and unavailable complete disposable application backend).

## Desktop/mobile security-flow recheck (2026-11-23)

- [x] Recheck authenticated sponsor requests, profile suggestions, and audit report at 390px/1440px.
- [x] Repeat disposable local function tests without changing real accounts (six groups pass; two criteria fail).
- [x] Record results and distinguish layout checks from end-to-end approval verification in docs/security/desktop-mobile-flow-recheck-2026-11-23.md.
- [ ] Certify populated UI approval/application (blocked by empty real queues, incomplete disposable backend, and unapplied local function corrections).

## Rodada 2 — homologação (2026-11-23)

- [x] Consultar o scan profundo existente, sem iniciar outro.
- [ ] Recuperar oito IDs históricos exatos (bloqueio: scan atual não retorna achados resolvidos; relatos antigos contraditórios).
- [x] Conferir controles ativos e abertura das cinco telas em 390px e 1440px.
- [x] Executar aprovação e aplicação com registros descartáveis locais; registrar falhas e limites.
- [x] Entregar relatório NO-GO com evidências de produção, sem nova publicação.
- [ ] Homologar fluxos completos (correções passam localmente; bloqueios: aplicação autorizada e ambiente descartável completo).
- [ ] Confirmar SHA público (bloqueio: domínio só apresenta deployment ID, sem vínculo verificável com commit).

## Incidente de estabilidade — 2026-09-02

- [x] Correlacionar códigos da tela fatal com `error_reports` e logs publicados.
- [x] Eliminar corrida de dupla assinatura Realtime no status de onboarding.
- [x] Eliminar corrida do canal Realtime de engajamento no pós-cadastro/dashboard.
- [x] Corrigir vazamento do canal de status do prestador na etapa final do Wizard.
- [x] Isolar recuperação de senha de acesso a `window` durante SSR.
- [x] Consolidar o conflito de rotas `/servico/:slug` em um único proprietário.
- [x] Confirmar anúncios públicos pela projeção segura `sponsors_public`.
- [x] Revalidar grants de PII em agências, vagas e prestadores.
- [ ] Publicar e acompanhar recorrência por versão/build durante 24 horas.

Prioridade adotada: **MVP = Sitemap + Canonical + Moderação de avaliações** (esta iteração).
Demais blocos ficam listados como tickets prontos para as próximas iterações.

## Fase 1 — MVP (concluído nesta iteração)

- [x] **SEO-01 · Sitemaps servidos em XML real**
  `/sitemap.xml` (índice) e `/sitemap?type=...&page=N` agora são rotas de servidor
  que entregam XML com `Content-Type` correto, ETag e cache. Antes havia redirect
  client-side (crawler recebia HTML vazio). Gerador continua único.
  Aceite: `curl -I /sitemap.xml` → 200 `application/xml`; índice cobre static,
  categories, especialidades, providers, companies, cities, neighborhoods, blog,
  jobs, pages, popular, seo, seo-cep.
- [x] **SEO-02 · Remoção do sitemap estático** (`public/sitemap.xml`) que sombreava
  a rota dinâmica e ficava defasado.
- [x] **MOD-01 · Avaliações só aparecem se aprovadas**
  Perfil público e contadores do prestador passam a filtrar `approval_status = 'approved'`
  (o admin já tinha aprovar/rejeitar em `/admin/avaliacoes`).

## Fase 2 — SEO avançado

- [ ] **SEO-03** Robots dinâmico por ambiente (preview `noindex`, produção liberado).
- [ ] **SEO-04** `/buscar` SEO-friendly: URLs canônicas por categoria+cidade e
      `noindex` reforçado em recortes finos.
- [ ] **SEO-05** Schema.org `LocalBusiness` / `ProfessionalService` no perfil e
      `BreadcrumbList` em todas as landings regionais/bairro.
- [ ] **SEO-06** Monitor de cobertura: alerta quando sub-sitemap fica vazio.

## Fase 3 — Conversão e telemetria

- [ ] **TEL-01** Telemetria segmentada por bairro nas landings.
- [ ] **TEL-02** A/B testing de CTA (WhatsApp vs formulário) com métricas por variante.
- [ ] **TEL-03** Export CSV dos relatórios de conversão no admin.

## Fase 4 — Admin e UX

- [ ] **ADM-01** Header unificado entre dashboards (admin, patrocinador, usuário).
- [ ] **ADM-02** Painel "Saúde do Sistema" consolidando GSC, e-mail e integridade.
- [ ] **UX-01** Correções mobile na Home.
- [ ] **UX-02** Mensagens de upload mais claras (erro, tamanho, formato).

## Incidente de conversão — cadastro de serviços mobile (2026-09-10)

- [x] Remover bloqueios contraditórios entre qualidade do anúncio e publicação.
- [x] Criar assistente de preenchimento visível e simples no celular.
- [x] Corrigir sobreposição da navegação inferior e largura/rolagem do formulário.
- [x] Tornar erros acionáveis e levar o foco ao campo que precisa de correção.
- [ ] Validar criação e persistência do serviço em celular e desktop.
