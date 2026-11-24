# Preciso de Um 360° — Rodada 2A

## Complemento 2A.1 — evidências e limpeza (2026-11-24)

**GO para continuidade da infraestrutura; NO-GO para integração completa e
publicação.** Este complemento atualiza o relatório existente, sem duplicá-lo.
Não iniciou 2B, scan, alterações em produção, migrações históricas ou testes do PDF.

### Melhorias implementadas

- Identificadores exclusivos por execução em projeto CLI/rede/diretório/JSON;
  relatório estruturado com SHA, workflow/run/attempt, tempo/versões/etapas,
  dependências ausentes, testes aprovados/reprovados/não executados, baseline,
  SQL candidato, migrations anunciada/falha identificada, limpeza e decisão.
- Subprocessos assíncronos com grupo de processos controlado, saída limitada
  em memória e nunca publicada. SIGINT/SIGTERM acionam encerramento; SIGKILL e
  encerramento sem verificação nunca certificam limpeza.
- Inventários Docker antes/depois, exclusão apenas de nomes do projeto exclusivo
  da execução e rede exata; verificação de arquivos/configuração/credenciais e
  processos locais com proteção contra PID reutilizado de outro projeto.
- Manifesto sanitizado persistido e `--cleanup` na etapa final `always()` do
  workflow existente; preserva recursos removidos e tentativas de limpeza.
- Artefatos por run/attempt mesmo em falha, sem segredos/SQL/logs brutos; resumo
  legível no GitHub Step Summary. PASS da infraestrutura não homologa negócio.

### Testes e artefatos

| Evidência | Resultado |
| --- | --- |
| Vitest de isolamento + ciclo de vida | PASS: 14 testes (3 existentes + 11 novos) |
| Falha intermediária/recursos residuais/Docker indisponível/escopo inválido/cleanup idempotente | PASS em adaptadores; não é integração Docker |
| SIGTERM real durante CLI start MOCK | PASS: candidato não aplicado, baseline não executado, arquivos/processos encerrados; integração não certificada |
| Sintaxe Node e diff | PASS |
| Execução real do orquestrador sem Docker | Interrompe com código 1/NO-GO; Docker ausente; 14 checks de baseline/candidato NÃO EXECUTADOS |
| Arquivos temporários locais | Diretório da execução removido, conferido no filesystem |
| Limpeza Docker completa | NÃO COMPROVADA: inventários inicial/final indisponíveis; relatório FAIL, inclusive na etapa final |
| Workflow real GitHub | PENDENTE: destino confirmado; candidato e workflow ausentes nas consultas, nenhum run disparado |

Artefatos locais ignorados pelo Git: `test-results/disposable-stack/local-2a1-verification-state.json`
e `local-2a1-verification-summary.json`. Execução completa produzirá também
`<execução>-baseline.json` e `<execução>-candidate.json`; ausências/skips ficam
explícitos no summary. JSONs sintéticos do teste de sinais são removidos para
não se misturarem à evidência do workflow real.

### GitHub e próxima ação mínima

A conexão **Henrique's GitHub API** respondeu HTTP 200 à pesquisa. Foram
encontrados `hrq16000-a11y/precisodeum_old`, `hrq16000-a11y/precisodeum_n` e
`hrq16000/precisodeumtecnico_2026`, todos com branch padrão `main`.
O commit anterior `231369e31c2392d217f33cab3b2685193b73471e` retornou HTTP 404
nos três; o workflow retornou HTTP 404 no legado. Esses 404 não comprovam,
isoladamente, ausência de permissão ou inexistência absoluta do recurso.
O remote local é armazenamento interno, não prova vínculo com um desses
repositórios. O usuário confirmou `hrq16000-a11y/precisodeum_old` em 2026-11-24.

Verificação pela conexão **Henrique's GitHub API**, após essa confirmação:

- `main`: HTTP 200, SHA `01d64b3e2b03df0d88a15aa341413e2ff78fc895`.
- Candidato local `ac783cc7fbb4476869327201c2600f1567fa70ee`: HTTP 422,
  mensagem `No commit found for SHA`.
- Workflow pela API Actions e arquivo `.github/workflows/disposable-stack.yml`
  em `main`: HTTP 404 em ambas as consultas.
- Nenhum dispatch enviado: não executar outro SHA como se fosse o candidato.
  Esses resultados não certificam a configuração/status do Git sync, que
  somente a interface do projeto permite conferir. Não houve escrita remota,
  alteração de branch, publicação ou execução de testes de integração.

**Bloqueio atual:** candidato ainda não confirmado no destino. Conferir
**Project settings → Git** no Lovable e sincronizar o candidato pelo fluxo
existente; não sobrescrever `main` pela API como alternativa ao Git sync.

Após confirmar o repositório e sincronizar o novo candidato em `main`:

```bash
# No GitHub/Codex autenticado, após confirmar o candidato sincronizado.
gh api repos/hrq16000-a11y/precisodeum_old/commits/ac783cc7fbb4476869327201c2600f1567fa70ee --jq .sha
gh api repos/hrq16000-a11y/precisodeum_old/git/ref/heads/main --jq .object.sha
gh workflow run disposable-stack.yml --repo hrq16000-a11y/precisodeum_old --ref main
gh run list --repo hrq16000-a11y/precisodeum_old --workflow disposable-stack.yml --limit 5
# Observar o run correspondente ao SHA, ler Step Summary e baixar seus artefatos.
```

O novo commit candidato é aquele que contém este complemento; SHA exato
informado após o commit. Não há execução remota simulada nem publicação.

### Arquitetura documentada, não implementada

Roadmap consolidado preserva 2A.1→2A.2→2B→2C→2D, 3A/3B/4A e 5A–5D:
Policy Lineage com snapshots/contratos/controle administrativo somente leitura;
modularização incremental **TanStack Start**, sem impor App.tsx ou trocar o
roteador; índice de cidades já usa shell dinâmico e precisa de medições antes
de nova otimização; Web Vitals por rota/versão. Não há rota Policy Lineage
dedicada encontrada; os módulos de governança existentes precisam ser avaliados
antes de criar outro. Release de segurança não depende dessas futuras melhorias.

### Arquivos desta micro-rodada

`.github/workflows/disposable-stack.yml`, `scripts/security/disposable-stack.mjs`,
`scripts/security/disposable-lifecycle.mjs`, `scripts/security/disposable-lifecycle.d.mts`,
`tests/security/disposable/verify-stack.mjs`, `src/test/disposable-stack-lifecycle.test.ts`,
`LOCAL_SETUP.md`, `AGENTS.md`, `roadmap.md` e este relatório. Guards, fixtures,
probe MOCK, seed, migrations e correção do PDF preservados.

## Objetivo e decisão

Preparar integração descartável funcional reutilizando histórico, seed e SQL
candidato. **GO para executar a infraestrutura preparada em Linux/GitHub com Docker;
NO-GO para homologação completa e publicação.** Não se iniciou a Rodada 2B.

## Bloqueio comprovado

O sandbox tem CLI 2.121.0 e PostgreSQL client, mas não tem executável Docker nem
socket `/var/run/docker.sock`. Não foram feitas tentativas de instalação ou
repetições de inicialização. PostgreSQL sintético sozinho não substitui Auth,
políticas reais, Storage e runtime. A alternativa autorizada foi implementada
em GitHub Actions, não apenas descrita como intenção.

O workflow **foi criado, mas não foi iniciado nem observado remotamente**:
não há ferramenta GitHub/Codex disponível nesta sessão para disparar a execução.
PRs que alterem os caminhos cobertos iniciam o teste; também há execução manual.
Não se presume que o salvamento deste commit já represente um run aprovado.

## Implementação efetiva

- Orquestrador cria projeto CLI temporário e independente em `/tmp`, com
  PostgreSQL 15 e migrations/seed copiados sem alterações. Não lê `.env` nem
  usa referências, credenciais ou dados hospedados.
- Remove variáveis herdadas de banco/Cloud e força daemon Docker local.
  Valida URLs loopback antes de autenticar ou alterar dados.
- Rede Docker interna bloqueia saída dos containers, incluindo possíveis
  webhooks/agendamentos históricos; downloads de imagens ocorrem pelo host.
- Testes usam Auth real para três usuários sintéticos, sessões por senha,
  escrita/leitura de perfil pela API, tentativa de escrita por outro usuário,
  papel administrativo por RPC, inventário RLS/RPC/auditoria, upload/download
  de objeto privado e negação anônima.
- Probe de runtime é **MOCK sintético** sem chamadas externas. Não é uma
  certificação de funções de negócio ou entrega de notificações.
- `--candidate` aplica o SQL existente somente no banco temporário, em
  transação, **após** aprovação do baseline; não o transforma em migration
  aplicada nem altera grants para fazer testes passarem.
- Falhas interrompem o gate; evidências JSON só contêm etapas, estados e
  último arquivo de migration anunciado. Não publicam SQL, tokens, senhas
  nem logs brutos. Containers/volumes e arquivos temporários são removidos.
- Workflow de PR com cancelamento de runs obsoletos, sem secrets de produção,
  e upload de evidências inclusive em falha. Notificações usam o próprio GitHub.

## Evidências novas e testes

| Verificação | Resultado | Limite |
| --- | --- | --- |
| Testes de isolamento (`disposable-stack-guards.test.ts`) | PASS — 3 testes | URLs externas negadas, credenciais/contexto remoto removidos e logs restritos a filename |
| Configuração gerada com CLI instalada + leitura TOML | PASS | PostgreSQL 15, seed habilitado e probe MOCK configurado; containers não iniciados |
| Sintaxe dos dois executáveis Node | PASS | Não substitui execução integrada |
| Execução sem Docker | FAIL esperado — código 1, NO-GO | Confirma interrupção sem candidato aplicado e sem produção alterada |
| Auth/persistência/RLS/RPC/Storage/runtime integrados | NÃO EXECUTADO | Exige Docker no runner/local; não apresentado como PASS |
| Candidato sobre schema completo | NÃO EXECUTADO | Depende de baseline completo |
| Aprovação, sugestões, concorrência, cadastro mobile | NÃO HOMOLOGADO | Micro-rodadas 2B/2C ainda necessárias |
| Compilação da preview | PASS — `build OK` | Última entrada observada 2026-11-24T04:31:04Z |
| Diff e preservação | PASS | PDF, config gerenciada, seed e migrations sem mudanças |

Não repetidos os quatro testes do PDF; não executado novo scan. O teste de
Storage valida infraestrutura privada com cliente administrativo, **não**
as políticas de fotos de serviços de profissionais. Inventário de auditoria
confirma existência/RLS, não atomicidade de uma aprovação. Essas distinções
permanecem explícitas nos resultados automatizados.

## Arquivos modificados/criados

- `.github/workflows/disposable-stack.yml`
- `scripts/security/disposable-stack.mjs`
- `scripts/security/disposable-guards.mjs`
- `scripts/security/disposable-guards.d.mts`
- `tests/security/disposable/verify-stack.mjs`
- `tests/security/disposable/functions/runtime-probe/index.ts`
- `src/test/disposable-stack-guards.test.ts`
- `LOCAL_SETUP.md`
- `AGENTS.md`
- `roadmap.md`
- `docs/security/round2a-disposable-2026-11-24.md`

## Migrations e publicação

**Nenhuma migration nova necessária para esta infraestrutura.** Histórico
intacto e nenhuma migration aplicada no banco real. O SQL de
`docs/security/local-fixes/related-flows.sql` permanece candidato local.
Nenhuma publicação, DNS, cadastro legítimo, secret, permissão hospedada ou
notificação externa foi alterada. Nenhum finding marcado fixed/ignored.

## Preparação da próxima micro-rodada

Os IDs existentes foram reaproveitados, sem scan adicional:

- `lov_finding_5c98e790929bfaee`: publicação de prestador sem aprovação.
- `lov_finding_a637c991f2cfd872`: publicação de **agência** sem aprovação.

O segundo não deve ser apresentado como um segundo finding de prestador.
Os detalhes e regras reais de ambos serão homologados em 2B; nenhum está
declarado resolvido agora. Riscos de patrocinadores, fotos, CSV e links antigos
também permanecem para a rodada autorizada seguinte.

**Próxima ação mínima:** executar `node scripts/security/disposable-stack.mjs
--candidate` no runner/Linux com Docker e ler os JSONs. Se o replay falhar,
corrigir somente a incompatibilidade comprovada em complemento local, sem
reescrever migrations aplicadas nem usar produção como laboratório. Não há
evidência ainda de que o histórico disponível reproduza integralmente o estado
hospedado atual; o gate não deve ocultar dependências ausentes.

Commit candidato: o commit que contém este relatório e os arquivos acima;
o hash exato consta na cópia entregue após o registro no Git.