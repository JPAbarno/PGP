# Feature: Remoção da aba Scorecard

## Status

Implementada.

## Data de implementação

Implementada após a criação das specs iniciais de SDD.

## Objetivo

Remover a aba e a rota `Scorecard` da plataforma.

A funcionalidade não faz parte do escopo atual da PGP e deve ser retirada para evitar ruído de produto, confusão de navegação e manutenção de uma experiência que não será priorizada nesta fase.

## Contexto

Atualmente existe uma rota:

- `/scorecard`

E há referências ao modo `scorecard` em componentes compartilhados da aplicação.

O Scorecard aparece atualmente em:

- `app/scorecard/page.tsx`
- `components/portal-shell.tsx`
- `components/partner-analytics-loader.tsx`
- `components/partner-analytics.tsx`

## Regra de produto

A aba `Scorecard` não deve estar disponível na interface da PGP nesta fase.

A plataforma deve priorizar o dashboard principal de análise de parcerias.

## Arquivos provavelmente afetados

- `app/scorecard/page.tsx`
- `components/portal-shell.tsx`
- `components/partner-analytics-loader.tsx`
- `components/partner-analytics.tsx`
- `app/dashboard/page.tsx`

## Requisitos funcionais

### RF-001 — Remover link da navegação

O link `Scorecard` deve ser removido da navegação principal.

### RF-002 — Remover ou neutralizar rota `/scorecard`

A rota `/scorecard` não deve mais exibir a página antiga.

A implementação pode:

- remover a página;
- redirecionar para `/dashboard`;
- ou retornar `notFound()`.

A decisão recomendada nesta fase é redirecionar para `/dashboard`, caso isso reduza risco de erro para usuários que tenham links antigos.

### RF-003 — Simplificar modo de visualização

Se o único modo restante for `dashboard`, os tipos e branches relacionados a `scorecard` devem ser removidos ou simplificados.

### RF-004 — Remover textos relacionados a scorecards

Textos visíveis que mencionem “scorecard” ou “scorecards” devem ser revisados e removidos, salvo quando forem parte de dados históricos não exibidos como aba/produto.

### RF-005 — Preservar funcionamento do dashboard

A remoção do Scorecard não pode quebrar o dashboard principal.

## Fora do escopo

Não faz parte desta feature:

- redesenhar o dashboard;
- criar nova página substituta;
- recriar o Scorecard em outro formato;
- alterar regras de métricas;
- alterar integrações com HubSpot ou Power BI;
- implementar autenticação.

## Critérios de aceite

A feature será considerada concluída quando:

- a aba `Scorecard` não aparecer mais na navegação;
- `/dashboard` continuar funcionando;
- a rota `/scorecard` não exibir mais a página antiga;
- não houver links principais para `Scorecard`;
- não houver erro de build causado por tipos `scorecard` obsoletos;
- textos visíveis relacionados a scorecard tiverem sido removidos ou justificados;
- a alteração estiver registrada nesta spec.

## Resultado da implementação

A aba `Scorecard` foi removida da navegação principal.

A rota `/scorecard` foi neutralizada para redirecionar para `/dashboard`.

O fluxo do dashboard foi simplificado com a remoção do prop/tipo `mode="scorecard"` e do branch específico que renderizava a antiga experiência de Scorecard.

Arquivos alterados:

- `components/portal-shell.tsx`
- `app/scorecard/page.tsx`
- `app/dashboard/page.tsx`
- `components/partner-analytics-loader.tsx`
- `components/partner-analytics.tsx`

Verificações realizadas:

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- Busca por `Scorecard/scorecard` em `app` e `components` só encontra o nome da função da rota redirecionada em `app/scorecard/page.tsx`.

## Ordem sugerida de implementação

1. Remover link `Scorecard` de `components/portal-shell.tsx`.
2. Ajustar tipo `active` para remover `scorecard`, se aplicável.
3. Remover ou redirecionar `app/scorecard/page.tsx`.
4. Simplificar `Mode` em `components/partner-analytics-loader.tsx`.
5. Remover branch `scorecard` em `components/partner-analytics.tsx`.
6. Conferir `app/dashboard/page.tsx` após ajustes.
7. Rodar build/lint.
