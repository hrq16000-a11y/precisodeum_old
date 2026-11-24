# Rodando o portal 100% localmente (sem nuvem, sem internet)

Este guia deixa o projeto rodando por completo na sua máquina: banco de dados,
Auth, Storage, Edge Functions e o app TanStack Start.

> **Limite de homologação:** este guia descreve a configuração pretendida, não
> comprova que todo o histórico de migrations e o seed foram executados com sucesso.
> O seed histórico silencia algumas falhas e não cria o prestador/cidade anunciados
> abaixo. Use o gate descartável da Rodada 2A antes de certificar esses fluxos.

## Rodada 2A — execução descartável reproduzível

```bash
# Linux, Node 22, Docker local ativo e CLI 2.121.0; dependências do projeto instaladas.
bunx vitest run src/test/disposable-stack-guards.test.ts
node scripts/security/disposable-stack.mjs
# Após baseline completo: aplica somente o candidato na cópia descartável.
node scripts/security/disposable-stack.mjs --candidate
```

- Nunca copia `.env`, credenciais hospedadas, `.temp` ou dados reais. Não usa `link`,
  `db push`, `--linked` nem `--db-url` hospedado. O daemon Docker é o socket local Linux.
- Gera configuração da CLI em `/tmp`, usa PostgreSQL 15, copia migrations/seed sem
  reescrever o histórico e destrói o stack/volumes ao terminar. Não modifica `supabase/config.toml`.
- Os containers usam rede Docker interna sem saída externa. Isso também impede
  cron/webhooks históricos de enviar mensagens durante o replay. A primeira execução
  exige internet **no host** para baixar as imagens Docker e instalar dependências.
- Cria usuários sintéticos pela Auth real; verifica sessão, persistência com leitura
  pela API, negação de escrita de perfil alheio, papel administrativo por RPC,
  Storage privado e resposta de um runtime MOCK explicitamente identificado.
- Não concede novas permissões para fazer o teste passar. Uma migration, trigger,
  policy ou seed incompatível interrompe a execução e mantém **NO-GO**.
- O MOCK não certifica funções de negócio, aprovação, notificações nem cadastro mobile.
  O teste de Storage é infraestrutura; as políticas de fotos existentes ficam para 2B.
- Evidências sanitizadas: `test-results/disposable-stack/*.json`. Nenhum token,
  senha, SQL com valores ou log bruto é publicado. Falha no replay aponta o último
  arquivo de migration anunciado, não certifica que ele seja a causa única.
- `.github/workflows/disposable-stack.yml` executa em PRs relevantes ou manualmente,
  em runner Linux com Docker, sem secrets de produção, cancelando runs obsoletos.
  Falhas notificam pelo mecanismo nativo do GitHub. O workflow existente de signup
  não foi alterado nem utilizado para esta homologação.
- Neste sandbox não há Docker nem socket: a execução completa está pendente no
  GitHub/local. Workflow criado não significa workflow executado; PASS de
  infraestrutura nunca libera publicação ou migração em produção.

### Rodada 2A.1 — evidência e limpeza por execução

- Reutiliza o mesmo workflow/orquestrador. Identificador exclusivo por run/attempt
  gera projeto CLI, rede, diretório temporário e artefatos independentes; não usa
  limpeza global. Arquivos de configuração e credenciais sintéticas ficam em `/tmp`.
- Relatório `test-results/disposable-stack/<execução>-summary.json`: SHA,
  workflow/run/attempt, início/fim/duração, versões, dependências ausentes,
  etapas, testes PASS/FAIL/NOT_EXECUTED, baseline/candidato e limpeza com recursos
  criados/removidos/residuais. Última migration anunciada é distinta da falha
  identificada; nenhuma delas é inferida de conteúdo SQL sensível.
- Manifesto `<execução>-state.json` contém apenas escopo local e identificadores
  de processos, nunca credenciais; subprocessos não emitem seus logs brutos.
- SIGINT/SIGTERM interrompem a execução e acionam limpeza. SIGKILL, crash do host
  ou cancelamento sem etapa final não comprovam limpeza; ausência de inventário
  ou manifesto mantém NO-GO. A etapa final `always()` repete a verificação do
  mesmo escopo e preserva o histórico de tentativas/recursos removidos.
- Testes direcionados: `bunx vitest run src/test/disposable-stack-guards.test.ts
  src/test/disposable-stack-lifecycle.test.ts`. Sinal/processos usam CLI/Docker
  **MOCK**; não certificam integração real.
- Recuperação final no mesmo runner: `DISPOSABLE_EXECUTION_ID=<id-do-run>
  node scripts/security/disposable-stack.mjs --cleanup`. Não reutilizar ID de
  outro run, não remover recursos por comandos globais e não executar o candidato
  em produção.
- Continuidade GitHub/Codex: confirmar repositório associado e branch `main`,
  sincronizar o commit candidato pelos mecanismos existentes e executar
  `gh workflow run disposable-stack.yml --repo OWNER/REPO --ref main` somente
  após confirmar que o SHA candidato e o workflow existem nessa branch. Ler o
  run e artefatos `disposable-backend-evidence-<run>-<attempt>`; não presumir PASS.

---

## 1. Pré-requisitos

| Ferramenta   | Versão mínima | Observação                                   |
| ------------ | ------------- | -------------------------------------------- |
| Docker       | 24+           | Precisa estar rodando antes do `supabase start` |
| Supabase CLI | 2.x           | `npm i -g supabase` ou `brew install supabase/tap/supabase` |
| Node / Bun   | Node 20+      | `npm install` ou `bun install`                |

> Depois do primeiro `supabase start` as imagens ficam em cache no Docker,
> então as execuções seguintes funcionam **sem internet**.

---

## 2. Passo a passo

```bash
# 1) dependências do app
npm install

# 2) variáveis de ambiente locais
cp .env.local.example .env

# 3) sobe Postgres + Auth + Storage + Studio + Edge Runtime (Docker)
npm run db:start

# 4) aplica TODAS as migrations + supabase/seed.sql em um banco limpo
npm run db:reset

# 5) app + Edge Functions locais
npm run dev:local
```

Endereços padrão:

| Serviço            | URL                       |
| ------------------ | ------------------------- |
| App (TanStack)     | http://localhost:8080     |
| API Supabase       | http://127.0.0.1:54321    |
| Studio (admin DB)  | http://127.0.0.1:54323    |
| Inbucket (e-mails) | http://127.0.0.1:54324    |
| Postgres           | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

---

## 3. Scripts disponíveis

| Script                      | O que faz                                              |
| --------------------------- | ------------------------------------------------------ |
| `npm run dev:local`         | Sobe o Vite/TanStack já apontando para o Supabase local |
| `npm run db:start` / `db:stop` | Liga/desliga o stack Docker do Supabase              |
| `npm run db:reset`          | Recria o banco: migrations + `supabase/seed.sql`        |
| `npm run db:status`         | Mostra URLs e chaves geradas localmente                 |
| `npm run db:diff`           | Gera uma nova migration a partir de alterações no Studio |
| `npm run functions:serve`   | Serve todas as Edge Functions em http://127.0.0.1:54321/functions/v1 |
| `npm run functions:serve:one -- nome-da-funcao` | Serve apenas uma função        |

---

## 4. Dados de teste (seed)

`supabase/seed.sql` cria, de forma idempotente:

- usuário admin `admin@local.test` / senha `admin123` (com `user_roles.role = 'admin'`);
- usuário profissional `pro@local.test` / senha `pro123` com `providers` aprovado;
- `site_settings` mínimos para a home, busca e feature flags não quebrarem;
- categorias e uma cidade de exemplo.

Rode novamente com `npm run db:reset` sempre que quiser voltar ao estado limpo.

---

## 5. Serviços de terceiros offline

Sem internet, chamadas externas são **simuladas** (nunca travam):

| Serviço                       | Comportamento local                        |
| ----------------------------- | ------------------------------------------ |
| Resend (`send-email`)         | `console.log` + retorno `{ ok: true, mocked: true }`; e-mails reais do Auth caem no Inbucket |
| Google Search Console         | submissão de sitemap retorna 200 simulado  |
| IndexNow / Bing               | ping simulado                              |

Controle manual pela env `LOCAL_MOCK_EXTERNAL=true|false`.

---

## 6. Isolamento contra produção

- `.env` local usa `VITE_SUPABASE_URL=http://127.0.0.1:54321`.
- O app loga no console qual backend está em uso em modo dev
  (`src/lib/localEnv.ts` → `logSupabaseTarget()`), então é impossível
  apontar sem querer para produção sem perceber.
- Nunca commite `.env`; apenas `.env.example` e `.env.local.example`.

---

## 7. Problemas comuns

- **`supabase start` falha**: confirme que o Docker está aberto e que as portas
  54321-54324 estão livres.
- **Tela em branco / 42501**: rode `npm run db:reset` — provavelmente faltam
  GRANTs/policies de uma migration nova.
- **Login não funciona**: use os usuários do seed; cadastro por e-mail exige
  confirmação, que está desabilitada localmente (`enable_confirmations = false`).
