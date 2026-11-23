# Rodada 2 — homologação, 23/11/2026

## Decisão: NO-GO específico

Sem nova publicação, novo scan, mudança de regras de acesso ou alteração de cadastros reais. Testes de escrita realizados exclusivamente num PostgreSQL temporário local, com dados sintéticos e funções copiadas da migração existente. Esse teste não replica todos os triggers, políticas e integrações de produção.

| Item | Resultado |
|---|---|
| Scan profundo existente | Concluído: 29 warnings. Scan de banco persistido: 2 warnings e 14 infos. Nenhum critical registrado; nenhuma indicação retornada de checks desativados. |
| Oito issues históricos | Controles recuperados, mas os relatos antigos são contraditórios e o resultado atual não contém os achados resolvidos. Não foi possível provar oito pares exatos de identificador/estado. |
| Admin | PASS para abertura autenticada e conteúdo em ambas as larguras; autorização de chamadas protegidas confirmada parcialmente. Não é certificação de todas as ações administrativas. |
| Audit | FAIL: auditoria resumida retorna 15 linhas; auditoria detalhada falha com coluna ambígua. Persistência de sugestões também falha. |
| Sponsor | FAIL no critério de rejeição: dez campos permitidos funcionam no teste isolado e campos protegidos não mudam, mas solicitação só com campo proibido é marcada aprovada. |
| Sugestões de perfil | FAIL no critério de auditoria: quatro campos e aliases de nome/documento persistem; campos proibidos e sugestões de outro dono são recusados. Auditoria não é gravada. |
| Mobile 390px | PASS de abertura/layout: cinco telas, sem overflow horizontal ou pageerror após aguardar carregamento e fechar resumo inicial. Escrita ponta a ponta pela interface não homologada. |
| Desktop 1440px | Mesmo resultado do mobile. |
| Produção | Domínio responde HTTP 200. Identificador de deployment observado; SHA publicado não comprovado. Funções e políticas atuais confirmadas no backend compartilhado. |
| Segurança | NO-GO para declarar homologação concluída ou liberar novas funcionalidades. |

## Rastreabilidade dos controles mencionados como “oito issues”

Não confundir oito grupos de correção com oito findings individuais: havia quatro identificadores de funções, um de inserção e dezoito de leitura na solicitação original. O histórico disse oito, três e seis em momentos diferentes. O scan atual só retorna findings ativos, não comprova os estados históricos resolvidos/ignorados.

| Grupo | Evidência atual | Estado/teste adicional |
|---|---|---|
| 1. Diagnóstico de consultas | `admin_explain_query(text)` sem execução para anon/authenticated; chamada de admin retorna 403. | Restrição comprovada. Pode afetar consumidores administrativos dessa ferramenta. |
| 2. Auditoria e revisão de patrocinador | Auditorias sem execução anônima; health/detailed são invoker; revisão exige admin e usa dez campos estáticos. | Health PASS; detailed FAIL; revisão parcialmente validada localmente. |
| 3. Inserção no feed | `public_activities` INSERT só com `has_role(...,'admin')`. | Política comprovada; escrita real não executada. |
| 4. Leitura do feed | Só seed, últimos 30 dias ou admin. | Política comprovada; conteúdo público não homologado nesta rodada. |
| 5. Posicionamentos de anúncios | Só ativos ou admin. | Política comprovada; não iniciar anúncios nesta rodada. |
| 6. Configurações de chat | SELECT authenticated; INSERT/UPDATE/DELETE admin. | Colunas/registro inspecionados: limites, textos e flags; sem segredo ou credencial encontrados. Aviso ativo `lov_db_rls_authenticated_only_v1_71ff59403ae3b624`. |
| 7. Níveis | Níveis em uso ou admin via `user_level_in_use`. | Política comprovada; necessita teste integrado de listagens. |
| 8. Impressões | SELECT apenas de prestadores approved. | Política comprovada; não homologado ranking público. |

Identificadores originais de funções: `lov_db_function_definer_executable_v1_13cb9dc24a03873f`, `lov_db_function_definer_executable_v1_69cb32c353b5eed9`, `lov_db_function_definer_executable_v1_b12938eef27e2a2d`, `lov_db_function_definer_executable_v1_b891483db6820082`. Sem metadata histórica não atribuir cada hash a uma função por inferência.

Feed: identificadores pedidos `lov_db_rls_authenticated_only_v1_bcfcd32f803d0a3c` e `lov_db_rls_tautology_permissive_v1_bcfcd32f803d0a3c`; política atual comprovada, estado histórico do scanner não recuperado. Nenhum finding foi ignorado ou marcado fixed nesta rodada.

## Falhas concretas e correção mínima proposta

1. `audit_user_ref_full_detailed()` retorna HTTP 400: `column reference "table_name" is ambiguous`. Qualificar os nomes das colunas do catálogo nas consultas e repetir a leitura autenticada. Não aplicado nesta rodada.
2. `resolve_identity_suggestion()` tenta inserir `target_type`, `target_id`, `metadata`, inexistentes em `audit_log`. O schema real tem `resource_type`, `resource_id`, `details`. O bloco captura qualquer erro e retorna sucesso. Usar as colunas reais e não silenciar falha de auditoria. Reproduzido com fixtures locais correspondentes ao schema. Não aplicado.
3. Revisão de patrocinador ignora campos fora dos dez permitidos, mas aprova a solicitação. Rejeitar payload com chaves proibidas antes de atualizar status; preservar dados e registro de auditoria. Não aplicado.

## Scan profundo: priorização sem alteração

Avisos relevantes: apropriação de cadastro de patrocinador por e-mail não confirmado; substituição de fotos de terceiros; script via link no relatório de leads; links de arquivos privados ainda válidos após revogação; publicação direta de prestador/agência. Os últimos devem ser conciliados com a aprovação automática desejada: ausência de moderação manual, sozinha, não prova vulnerabilidade; impedir edição direta de campos privilegiados continua importante.

Função ativa `claim_sponsor_lead` consulta e compara e-mail, mas não valida sua confirmação. Correção mínima proposta: exigir identidade com e-mail confirmado antes de vincular, mantendo checagem de titularidade e evitando corrida. Não executado teste de apropriação real.

Há também exportações suscetíveis a fórmulas e ferramentas administrativas com destinos externos escolhidos pelo chamador. Não alteradas por estarem fora da homologação solicitada.

Storage: avatars, portfolio, service-images e sponsors são públicos; sponsor_assets, portability e error-attachments são privados. Regra de leitura/listagem pública inspecionada. Isso não prova que todos os objetos nessas pastas sejam publicáveis; inventário de conteúdo não concluído, e links assinados antigos permanecem um risco separado.

## Produção e reversão

- Commit salvo antes desta rodada: `b7442aa612538e1d457363d980d620a140b0ea92` (inclui somente north-star). Correção de funções em `c422976d3a8d5364d987685b843a292938413802`; políticas em `fd9b9e886145ee3e6129ddea37c6b8f7231dd850`.
- Domínio público respondeu HTTP 200 e título Preciso de um. Header `x-deployment-id`: `psr2.2535beba-6173-4a42-b101-046c7dc86686.1796078878.uxWIFrMDjwWpDDfsIqBpFnIU6qE5suZaWN9SD9egf1U`. Asset observado `/assets/index-D4RMIUMK.js`. Nenhum desses prova qual SHA foi publicado.
- Código de telas/server routes só vai ao ar após publicação. Banco/migrações aplicadas e edge functions implantadas têm efeito imediato; salvar código não equivale a publicá-lo.
- Histórico pode restaurar código, mas não desfaz automaticamente migrações/dados. Reversão do banco exige migração compensatória revisada; não restaurar grants inseguros. Não executada reversão.

## Evidências e limites

- Backend real: health 200/15 linhas; detailed 400; diagnóstico 403; decisão inválida/sugestão inválida 400; auditoria/revisão anônimas 401.
- Cinco telas autenticadas em 390×844 e 1440×1000: dashboard, admin, portabilidade, solicitações de patrocinador, sugestões de identidade. Sem pageerror/overflow na conferência final. Primeiras capturas foram durante loading: não contabilizadas como PASS.
- Não havia sugestões nem solicitações de patrocinador existentes (ambas contagens zero). Não modificar registros reais para preencher esse vazio.
- `audit_log` tinha 22.279 linhas no momento da leitura; não existe baseline anterior à correção para afirmar igualdade dos totais.
- Teste SQL local `tests/security/round2-isolated.sql`: seis grupos PASS e duas condições FAIL, exit 3 intencional. Dados em transação abortada; servidor temporário encerrado. Fixtures mínimas em `tests/security/round2-fixture.sql`; carregar também as duas funções da migração `0002` antes do teste. Não aplicar esses arquivos no backend compartilhado.

Bloqueios restantes: corrigir as três falhas concretas, repetir testes SQL e interface com backend isolado completo, recuperar os oito IDs exatos resolvidos, confirmar SHA público e tratar riscos relevantes antes de declarar GO. Não iniciar anúncios pendentes, métricas ou SEO nesta rodada.