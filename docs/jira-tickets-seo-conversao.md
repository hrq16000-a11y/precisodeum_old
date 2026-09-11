# Tickets prontos para Jira — SEO programático, sitemap e conversões

Estimativas em horas (dev sênior). Itens marcados "entregue" já existem no projeto
e servem como referência de escopo/regressão.

## Épico 1 — Páginas programáticas de serviço

| Chave | Título | Descrição | Estimativa | Status |
|---|---|---|---|---|
| SEO-101 | Engine de verticais (pintor/eletricista/encanador) | `src/lib/programmaticServices.ts` com slugs, labels e paths canônicos | 8h | entregue |
| SEO-102 | Landing /servico/{vertical}/{cidade} | Rota, loader server-side, head SEO, JSON-LD | 12h | entregue |
| SEO-103 | Landing por bairro | Gate anti-thin (>=2 profissionais), canonical e cross-links | 8h | entregue |
| SEO-104 | Conteúdo editorial por região | `serviceCityEditorial.ts` determinístico por UF/cidade | 10h | entregue |
| SEO-105 | Expansão para novas cidades | Job de inventário + revisão editorial por lote | 6h/lote | recorrente |
| SEO-106 | Overrides de title/meta/JSON-LD no admin | `programmatic_page_overrides` + dialog CRUD | 10h | entregue |

## Épico 2 — Sitemap e indexação

| Chave | Título | Descrição | Estimativa | Status |
|---|---|---|---|---|
| SEO-201 | Sitemap index particionado | `/sitemap.xml` + sub-sitemaps por tipo, servidos em XML real | 8h | entregue |
| SEO-202 | Submissão automática ao GSC | Edge `gsc-submit-sitemaps` + workflow diário | 6h | entregue |
| SEO-203 | Reindexação manual por cidade | Botão no admin + registro em `gsc_audit_log` | 5h | entregue |
| SEO-204 | Monitoramento 7 dias pós-publicação | Alerta de páginas não indexadas + fila de correção | 8h | pendente |

## Épico 3 — Dashboard de conversões

| Chave | Título | Descrição | Estimativa | Status |
|---|---|---|---|---|
| CONV-301 | Eventos page_view / form_submit / whatsapp_click com cidade+bairro | Funil canônico em `audit_log` | 10h | entregue |
| CONV-302 | /admin/conversao-geo | Tabela + gráfico diário + CSV | 12h | entregue |
| CONV-303 | Desempenho por cidade com métricas GSC | Clicks, impressões, CTR, posição média | 10h | entregue |
| CONV-304 | Backlinks por cidade | Depende de fonte externa (Semrush/Ahrefs) — não fornecido pelo GSC | 8h | bloqueado |

## Épico 4 — Leads e WhatsApp

| Chave | Título | Descrição | Estimativa | Status |
|---|---|---|---|---|
| LEAD-401 | Link WhatsApp contextual por lead | `wa_encode_text` + `notifications.metadata.wa_link` | 8h | entregue |
| LEAD-402 | Envio automático via WhatsApp Business API | Requer credenciais de provedor (Meta/Twilio/360dialog) | 16h | bloqueado |

## Épico 5 — Administração de profissionais

| Chave | Título | Descrição | Estimativa | Status |
|---|---|---|---|---|
| ADM-501 | Painel de profissionais com aprovação/rejeição | `/admin/prestadores` (alias `/admin/profissionais`) | 14h | entregue |
| ADM-502 | Filtros por cidade e categoria + ações em lote | Busca, paginação e auditoria | 6h | entregue |
| ADM-503 | Histórico de ações e notificações | `audit_log` + `notifications` | 6h | entregue |
