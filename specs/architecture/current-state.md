# Estado Atual da Arquitetura

## Visão geral

O projeto atual da PGP utiliza Next.js com App Router e TypeScript.

A aplicação possui páginas em `app/`, componentes visuais e analíticos em `components/`, funções auxiliares e mocks em `lib/`, além de um snapshot consolidado de dados em `data/`.

Este documento descreve o estado atual observado do projeto antes da implementação das próximas mudanças de produto.

## Stack atual

- Next.js com App Router
- TypeScript
- React
- API routes em `app/api`
- Dados mockados em `lib/`
- Snapshot consolidado em `data/`
- Deploy/configuração com `vercel.json`

## Estrutura geral

```txt
app/          páginas e API routes
components/   shell visual, navegação e dashboards
lib/          tipos, mocks e funções analíticas
data/         snapshot JSON consolidado
public/       SVGs padrão do Next
```

## Arquivos de configuração relevantes

* `package.json`
* `tsconfig.json`
* `next.config.ts`
* `vercel.json`
* `app/globals.css`

## Rotas de páginas existentes

* `/` redireciona para `/dashboard`
* `/dashboard` é o dashboard principal
* `/scorecard` é a página Scorecard

## API routes existentes

* `GET /api/partner-metrics`
* `GET /api/partner-metrics/rebuild`
* `POST /api/partner-metrics/rebuild`
* `POST /api/partner-metric-details`
* `GET /api/debug-r1`
* `GET /api/debug-deal`

O arquivo `vercel.json` agenda crons para `/api/partner-metrics/rebuild`.

## Componentes principais

### `components/portal-shell.tsx`

Responsável por:

* layout geral;
* cabeçalho;
* navegação;
* link atual para `Scorecard`;
* tipo `active: "dashboard" | "scorecard"`.

### `components/partner-analytics-loader.tsx`

Responsável por:

* carregamento client-side;
* cache em `sessionStorage`;
* busca em `/api/partner-metrics`;
* fallback para mock;
* tipo `Mode = "dashboard" | "scorecard"`;
* repasse do modo para o componente de análise.

### `components/partner-analytics.tsx`

Componente principal da análise.

Concentra:

* filtros;
* cards;
* ranking;
* paretos;
* highlights/lowlights;
* scorecard executivo;
* tabela de jornada.

Componentes internos relevantes:

* `FilterBar`
* `RankingTable`
* `ParetoChart`
* `HighlightsLowlights`
* `ExecutiveBoard`
* `MeetingJourneyTable`

## Arquivos de dados e mocks

### `lib/mock-data.ts`

Contém tipos e dados mockados:

* `PartnerMetric`
* `PartnerDeal`
* `ServiceJourneyEvent`

### `lib/analytics.ts`

Contém funções de:

* filtros;
* totalizações;
* paretos;
* formatação.

### `data/partner-metrics-snapshot.json`

Snapshot grande com métricas reais/consolidadas.

### `app/api/partner-metrics/route.ts`

Gera/consolida dados via HubSpot + Power BI e grava o snapshot.

## Estado atual de autenticação e controle de acesso

Atualmente, não há autenticação de usuário na aplicação.

Não foram encontrados:

* `middleware.ts`;
* login/logout;
* sessão de usuário;
* NextAuth/Auth.js;
* Clerk;
* Supabase;
* Firebase;
* validação de domínio `galapos.com.br`.

Existe apenas um controle parcial em `app/api/partner-metrics/rebuild/route.ts`.

Nesse arquivo, o método `GET` compara `Authorization: Bearer ${CRON_SECRET}` quando `CRON_SECRET` existe.

O `POST` manual não aplica essa checagem.

As demais APIs dependem de tokens de serviço no backend, mas isso não restringe acesso de usuários finais.

## Pontos relacionados ao Scorecard

O Scorecard aparece em:

* `app/scorecard/page.tsx`
* `components/portal-shell.tsx`
* `components/partner-analytics-loader.tsx`
* `components/partner-analytics.tsx`

Detalhes:

* `app/scorecard/page.tsx` define a página `/scorecard`;
* `components/portal-shell.tsx` contém link de navegação `Scorecard` e tipo `active: "dashboard" | "scorecard"`;
* `components/partner-analytics-loader.tsx` contém tipo `Mode = "dashboard" | "scorecard"`;
* `components/partner-analytics.tsx` contém tipo `Mode`, branch condicional por modo, texto com “scorecards” e seção `Scorecard executivo`.

## Observações para próximas mudanças

As próximas mudanças devem ser feitas com cuidado para não quebrar o dashboard principal.

A remoção do `Scorecard` deve considerar tanto a rota `/scorecard` quanto os tipos e branches associados ao modo `scorecard`.

A implementação de autenticação deve considerar páginas e APIs. Proteger apenas a interface não é suficiente, porque as API routes também retornam dados sensíveis.
