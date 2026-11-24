# Preciso de Um 360° — Rodada 2A

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