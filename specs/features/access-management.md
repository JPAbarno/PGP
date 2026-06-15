# Feature: Gestão de Acessos Internos

## Status

Implementada.

## Objetivo

Implementar controle de acesso para garantir que apenas usuários internos da Galapos consigam acessar a PGP.

Nesta fase, a plataforma não será disponibilizada para parceiros externos, clientes ou usuários de outros domínios.

## Regra principal

Na fase inicial, somente usuários autenticados com e-mail corporativo Galapos podiam acessar a aplicação.

Domínio permitido na fase inicial:

- `@galapos.com.br`

A ADR-007 define a evolução desta regra para a Fase 3, pendente de implementação.

A regra passará a ser, após implementação da Fase 3:

- Auth.js/Entra ID autentica a identidade do usuário.
- O Dataverse decide a autorização via `getManagedAccessDecision()`.
- O domínio de e-mail deixará de ser a fonte de autorização.
- Usuário autenticado não cadastrado no Dataverse deverá ser bloqueado com `403`.
- Usuário autenticado com status inativo deverá ser bloqueado com `403`.
- Usuário `Parceiro` sem parceiro associado no Dataverse deverá ser bloqueado com `403`.

## Contexto atual

Atualmente, a aplicação não possui autenticação de usuário.

Não foram encontrados:

- `middleware.ts`;
- login/logout;
- sessão de usuário;
- NextAuth/Auth.js;
- Clerk;
- Supabase;
- Firebase;
- validação de domínio `galapos.com.br`.

Existe apenas proteção parcial para cron em:

- `app/api/partner-metrics/rebuild/route.ts`

Essa proteção não deve ser considerada autenticação de usuário final.

## Escopo

A feature deve contemplar:

- autenticação de usuário;
- validação de domínio `@galapos.com.br`;
- proteção das páginas internas;
- proteção das APIs internas relevantes;
- redirecionamento de usuários não autenticados;
- bloqueio de usuários autenticados com e-mail externo;
- eventual exibição de estado de usuário e logout na interface.

## Fora do escopo

Não faz parte desta feature:

- acesso para parceiros externos;
- portal de parceiros;
- permissões por parceiro;
- multi-tenant;
- perfis complexos de autorização;
- RBAC avançado;
- gestão administrativa de usuários;
- convites manuais;
- cadastro público.

## Requisitos funcionais

### RF-001 — Bloquear usuário não autenticado

Usuário não autenticado não deve conseguir acessar páginas internas da aplicação.

Ao tentar acessar uma página protegida, deve ser redirecionado para login ou receber uma tela de acesso apropriada.

### RF-002 — Permitir apenas domínio Galapos (substituído pela ADR-007)

Na fase inicial, o usuário autenticado só poderia acessar a plataforma se seu e-mail terminasse com `@galapos.com.br`.

A ADR-007 define a remoção dessa restrição do callback `signIn` do Auth.js e do middleware. A implementação da Fase 3 deverá realizar essa remoção. O Dataverse passará a ser a fonte de autorização.

### RF-003 — Bloquear usuários não autorizados (evoluído pela ADR-007)

Na fase inicial, usuários com e-mails externos eram bloqueados por domínio no callback `signIn` e no middleware.

Na Fase 3, o bloqueio passará a ser responsabilidade do Dataverse, aplicado pelas APIs:

- Usuários autenticados não cadastrados no Dataverse recebem `403`.
- Usuários autenticados com status inativo recebem `403`.
- Usuários `Parceiro` sem parceiro associado recebem `403`.

A página de acesso negado deve exibir mensagem genérica, sem revelar o motivo do bloqueio, o domínio exigido, detalhes de configuração ou qualquer distinção entre os casos de negação.

### RF-004 — Proteger rotas de página

As páginas internas devem exigir autenticação e domínio permitido.

Rotas conhecidas:

- `/dashboard`

A rota `/scorecard` será removida ou redirecionada conforme a spec `remove-scorecard.md`.

### RF-005 — Proteger API routes internas

As APIs que retornam dados da plataforma também devem validar acesso quando forem chamadas por usuários finais.

Rotas existentes:

- `GET /api/partner-metrics`
- `GET /api/partner-metrics/rebuild`
- `POST /api/partner-metrics/rebuild`
- `POST /api/partner-metric-details`
- `GET /api/debug-r1`
- `GET /api/debug-deal`

A proteção de APIs deve considerar separadamente:

- chamadas feitas por usuário logado;
- chamadas feitas por cron;
- chamadas internas com segredo de serviço.

### RF-006 — Preservar cron com segredo

O fluxo de cron em `/api/partner-metrics/rebuild` não deve ser quebrado.

Se existir `CRON_SECRET`, chamadas automatizadas devem continuar podendo usar:

- `Authorization: Bearer ${CRON_SECRET}`

### RF-007 — Centralizar domínio permitido

A regra de domínio permitido deve ficar centralizada em configuração ou função utilitária, evitando validações espalhadas.

Exemplo conceitual:

- `ALLOWED_EMAIL_DOMAIN=@galapos.com.br`

## Requisitos não funcionais

- A solução deve ser simples para o estágio atual do projeto.
- A autenticação deve ser compatível com Next.js App Router.
- A implementação não deve exigir reescrita completa do projeto.
- As regras de acesso devem ser testáveis manualmente.
- A solução deve permitir evolução futura para perfis de usuário, se necessário.

## Critérios de aceite

A feature será considerada concluída quando:

- usuários não autenticados não conseguirem acessar `/dashboard`;
- usuários com e-mail `@galapos.com.br` conseguirem acessar a plataforma;
- usuários com e-mail externo forem bloqueados;
- APIs internas relevantes estiverem protegidas;
- cron/rebuild continuar funcionando com o segredo adequado;
- a regra de domínio estiver centralizada;
- houver fluxo claro de login/logout ou equivalente;
- a aplicação continuar funcionando em build.

## Arquivos provavelmente afetados

- `middleware.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/api/**/route.ts`
- `components/portal-shell.tsx`
- `package.json`

## Decisão técnica relacionada

A solução de autenticação escolhida para esta feature será registrada em:

- `specs/decisions/ADR-003-authjs-microsoft-entra-id.md`

A decisão atual é usar Auth.js/NextAuth com Microsoft Entra ID/Azure AD e restrição de domínio `@galapos.com.br`.

A decisão inicial previa Google OAuth, registrada em `specs/decisions/ADR-002-authjs-google-oauth.md`, mas foi substituída após teste manual identificar que os usuários corporativos Galapos utilizam contas Microsoft.

## Plano técnico de implementação

### Arquivos a criar

- `auth.ts`: configuração central do Auth.js/NextAuth, provider Microsoft Entra ID/Azure AD, callbacks e validação de domínio.
- `middleware.ts`: proteção das páginas internas, especialmente `/dashboard`.
- `app/api/auth/[...nextauth]/route.ts`: route handler do Auth.js/NextAuth.
- `lib/access-control.ts` ou `lib/auth/access-control.ts`: funções utilitárias para centralizar regras de acesso.
- `app/access-denied/page.tsx`: página simples para usuários autenticados com e-mail externo, se adotada.

### Arquivos a alterar

- `package.json` e `package-lock.json`: adicionar dependência de autenticação.
- `app/layout.tsx`: ajustar estrutura se a solução exigir provider de sessão.
- `app/page.tsx`: manter ou ajustar redirecionamento inicial considerando sessão.
- `app/dashboard/page.tsx`: garantir proteção server-side ou compatibilidade com middleware.
- `components/portal-shell.tsx`: exibir usuário autenticado e ação de logout, se aplicável.
- `app/api/partner-metrics/route.ts`: validar sessão para chamadas de usuário final.
- `app/api/partner-metrics/rebuild/route.ts`: preservar `CRON_SECRET` para cron e definir regra para `POST` manual autenticado.
- `app/api/partner-metric-details/route.ts`: validar sessão/domínio.
- `app/api/debug-r1/route.ts`: validar sessão/domínio ou restringir mais fortemente.
- `app/api/debug-deal/route.ts`: validar sessão/domínio ou restringir mais fortemente.

### Dependência prevista

- `next-auth`

Instalação provável:

- `npm install next-auth`

### Variáveis de ambiente necessárias

- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_MICROSOFT_ENTRA_ID`
- `AUTH_MICROSOFT_ENTRA_SECRET`
- `AUTH_MICROSOFT_ENTRA_TENANT_ID`
- `ALLOWED_EMAIL_DOMAIN=@galapos.com.br`
- `CRON_SECRET`

Também será necessário configurar no Microsoft Entra ID os redirect URIs:

- `http://localhost:3000/api/auth/callback/azure-ad`
- `https://<dominio-producao>/api/auth/callback/azure-ad`

### Proteção de páginas

Usar `middleware.ts` para proteger rotas internas.

Inicialmente proteger:

- `/dashboard`

Regras:

- usuário sem sessão deve ser redirecionado para login;
- usuário com sessão, mas e-mail externo, deve ser redirecionado para `/access-denied` ou equivalente;
- `/api/auth/*`, assets e rotas internas do Next devem ficar fora da proteção.

### Proteção de APIs

Criar helper reutilizável para centralizar validações, por exemplo:

- `isAllowedEmail(email)`
- `requireInternalUser()`
- `isCronAuthorized(request)`

Aplicar proteção nas APIs que retornam dados sensíveis:

- `GET /api/partner-metrics`
- `POST /api/partner-metric-details`
- `GET /api/debug-r1`
- `GET /api/debug-deal`

### Preservação do cron

Na rota `app/api/partner-metrics/rebuild/route.ts`, manter autorização via header:

- `Authorization: Bearer ${CRON_SECRET}`

A checagem deve aceitar dois caminhos:

- chamada automatizada com `CRON_SECRET`;
- chamada de usuário interno autenticado via sessão.

Não exigir sessão de usuário para chamada de cron.

### Riscos técnicos

- configuração incorreta do Microsoft Entra ID pode bloquear login;
- `NEXTAUTH_URL` ou redirect URI incorreto pode causar falha no callback;
- mapeamento incorreto de `email`, `preferred_username` ou `upn` pode bloquear usuários válidos;
- middleware mal configurado pode bloquear `/api/auth/*`;
- proteger só páginas e esquecer APIs deixaria dados sensíveis acessíveis;
- aplicar proteção de sessão ao cron sem exceção quebraria rebuild automático;
- diferenças entre versões do NextAuth/Auth.js podem exigir ajuste fino;
- validação de domínio apenas no frontend seria insuficiente;
- rotas de debug podem expor dados além do necessário.

## Resultado parcial da implementação — Etapa 1

A primeira etapa da gestão de acessos internos foi implementada.

Nesta etapa, foram criadas as bases de autenticação com Auth.js/NextAuth e Google OAuth, sem ainda proteger páginas ou APIs.

### Arquivos criados

- `auth.ts`: configuração base do NextAuth com Google OAuth e validação de domínio no callback `signIn`.
- `app/api/auth/[...nextauth]/route.ts`: handlers `GET` e `POST` do NextAuth.
- `lib/access-control.ts`: helper central para domínio permitido `galapos.com.br`.

### Arquivos alterados

- `package.json`: adicionada dependência `next-auth`.
- `package-lock.json`: atualizado pelo `npm.cmd install next-auth`.

### Variáveis esperadas

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `ALLOWED_EMAIL_DOMAIN`, com fallback para `galapos.com.br`

### Fora do escopo mantido nesta etapa

- `/dashboard` ainda não foi protegido.
- APIs ainda não foram protegidas.
- `/api/partner-metrics/rebuild` ainda não foi alterada.
- O cron ainda não foi alterado.
- RBAC não foi implementado.
- Acesso para parceiros externos não foi implementado.

### Verificações realizadas

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.
- O build passou a listar a rota `ƒ /api/auth/[...nextauth]`.

### Observações

O comando de instalação reportou vulnerabilidades existentes no `npm audit`, mas `npm audit fix` não foi executado porque isso foge do escopo desta etapa.

## Resultado parcial da implementação — Etapa 2

A segunda etapa da gestão de acessos internos foi implementada.

Nesta etapa, foram protegidas as páginas internas iniciais, sem ainda proteger APIs ou alterar o fluxo de cron.

### Arquivos criados ou alterados

- `middleware.ts`: protege apenas `/dashboard/:path*`.
- `app/access-denied/page.tsx`: página simples para usuários autenticados com e-mail externo.
- `auth.ts`: ajustado para redirecionar login externo para `/access-denied` e garantir e-mail no JWT.

### Comportamento implementado

- Usuário sem sessão ao acessar `/dashboard` é redirecionado para `/api/auth/signin`.
- Usuário autenticado com e-mail fora do domínio permitido é redirecionado para `/access-denied`.
- `/api/auth/*`, APIs, assets, `_next`, favicon e rotas internas do Next ficam fora da proteção porque o matcher cobre apenas `/dashboard/:path*`.
- `/scorecard` continua redirecionando para `/dashboard`, preservando o fluxo anterior.

### Fora do escopo mantido nesta etapa

- APIs ainda não foram protegidas.
- `/api/partner-metrics/rebuild` ainda não foi alterada.
- O cron ainda não foi alterado.
- RBAC não foi implementado.
- Acesso para parceiros externos não foi implementado.
- Regras de métricas não foram alteradas.
- Integrações com HubSpot e Power BI não foram alteradas.

### Verificações realizadas

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Observação técnica

O build exibiu aviso do Next 16 indicando que `middleware` está deprecado em favor de `proxy`.

A decisão nesta etapa foi manter `middleware.ts`, porque a spec atual pedia explicitamente esse arquivo e a mudança para `proxy` ampliaria o escopo. Uma migração para `proxy` poderá ser tratada em spec ou ADR futura, se necessário.

## Resultado parcial da implementação — Etapa 3A

A terceira etapa, parte A, da gestão de acessos internos foi implementada.

Nesta etapa, foram protegidas as APIs usadas pelo usuário final, sem alterar cron, rotas de debug ou integrações.

### Arquivos alterados

- `lib/access-control.ts`: adicionado `getInternalUserAccessStatus()` para centralizar a classificação de acesso por e-mail.
- `app/api/partner-metrics/route.ts`: `GET /api/partner-metrics` agora exige sessão válida e e-mail permitido.
- `app/api/partner-metric-details/route.ts`: `POST /api/partner-metric-details` agora exige sessão válida e e-mail permitido.

### Comportamento implementado

- Sem sessão: retorna `401` com mensagem `Autenticação necessária`.
- Sessão com e-mail externo: retorna `403` com mensagem `Acesso restrito a usuários Galapos`.
- Sessão com e-mail `@galapos.com.br`: segue o fluxo existente da API.

### Fora do escopo mantido nesta etapa

- `/api/partner-metrics/rebuild` não foi alterada.
- O cron não foi alterado.
- Rotas de debug ainda não foram protegidas.
- Regras de métricas não foram alteradas.
- Integrações com HubSpot e Power BI não foram alteradas.
- RBAC não foi implementado.
- Acesso para parceiros externos não foi implementado.
- `middleware.ts` não foi migrado para `proxy`.

### Verificações realizadas

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Observação técnica

O build manteve o aviso já conhecido do Next 16 sobre `middleware` estar deprecado em favor de `proxy`.

A migração para `proxy` permanece fora do escopo atual.

## Resultado parcial da implementação — Etapa 3B

A terceira etapa, parte B, da gestão de acessos internos foi implementada.

Nesta etapa, foram protegidas as rotas de debug, sem alterar o fluxo de rebuild, cron ou `CRON_SECRET`.

### Arquivos alterados

- `app/api/debug-r1/route.ts`: `GET /api/debug-r1` agora exige sessão válida e e-mail permitido antes de acessar HubSpot.
- `app/api/debug-deal/route.ts`: `GET /api/debug-deal` agora exige sessão válida e e-mail permitido antes de acessar HubSpot.

### Comportamento implementado

- Sem sessão: retorna `401` com mensagem `Autenticação necessária`.
- Sessão com e-mail externo: retorna `403` com mensagem `Acesso restrito a usuários Galapos`.
- Sessão com e-mail `@galapos.com.br`: preserva o fluxo existente da rota.

### Fora do escopo mantido nesta etapa

- `/api/partner-metrics/rebuild` não foi alterada.
- O cron não foi alterado.
- `CRON_SECRET` não foi alterado.
- APIs da Etapa 3A não foram alteradas.
- Regras de métricas não foram alteradas.
- Integrações com HubSpot e Power BI não foram alteradas.
- RBAC não foi implementado.
- Acesso para parceiros externos não foi implementado.
- `middleware.ts` não foi migrado para `proxy`.

### Verificações realizadas

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Observação técnica

O build manteve o aviso já conhecido do Next 16 sobre `middleware` estar deprecado em favor de `proxy`.

A migração para `proxy` permanece fora do escopo atual.

## Resultado parcial da implementação — Etapa 3C

A terceira etapa, parte C, da gestão de acessos internos foi implementada.

Nesta etapa, foi protegida a rota de rebuild, preservando o funcionamento automatizado por `CRON_SECRET` e permitindo execução manual apenas por usuário interno autenticado.

### Arquivos alterados

- `lib/access-control.ts`: adicionado `isCronAuthorized(request)` para centralizar a validação de `Authorization: Bearer ${CRON_SECRET}`.
- `app/api/partner-metrics/rebuild/route.ts`: `GET` e `POST` agora aceitam `CRON_SECRET` válido ou sessão interna `@galapos.com.br`.

### Comportamento implementado

- `CRON_SECRET` válido: executa rebuild com origem cron.
- Usuário interno autenticado: executa rebuild com origem manual.
- Sem sessão e sem segredo válido: retorna `401`.
- Sessão com e-mail externo: retorna `403`.
- `POST` manual deixou de ser aberto e agora exige usuário interno ou segredo válido.

### Fora do escopo mantido nesta etapa

- APIs das etapas anteriores não foram alteradas.
- Rotas de debug não foram alteradas.
- Regras de métricas não foram alteradas.
- Integrações com HubSpot e Power BI não foram alteradas.
- RBAC não foi implementado.
- Acesso para parceiros externos não foi implementado.
- `middleware.ts` não foi migrado para `proxy`.

### Verificações realizadas

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Observação técnica

O build manteve o aviso já conhecido do Next 16 sobre `middleware` estar deprecado em favor de `proxy`.

A migração para `proxy` permanece fora do escopo atual.

## Resultado parcial da implementação — Etapa 4

A quarta etapa da gestão de acessos internos foi implementada e validada.

Nesta etapa, o provider de autenticação foi migrado de Google OAuth para Microsoft Entra ID/Azure AD, mantendo Auth.js/NextAuth e preservando as proteções de páginas, APIs, rotas de debug e rebuild.

### Arquivos alterados

- `auth.ts`: substituído `GoogleProvider` por `AzureADProvider` do NextAuth v4.

### Variáveis usadas

- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_MICROSOFT_ENTRA_ID`
- `AUTH_MICROSOFT_ENTRA_SECRET`
- `AUTH_MICROSOFT_ENTRA_TENANT_ID`
- `ALLOWED_EMAIL_DOMAIN`
- `CRON_SECRET`

As variáveis `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` deixaram de ser usadas para autenticação.

### Callback configurada

Para desenvolvimento local:

- `http://localhost:3000/api/auth/callback/azure-ad`

Para produção:

- `https://<dominio-producao>/api/auth/callback/azure-ad`

### Testes manuais realizados

- Login com conta Microsoft corporativa Galapos.
- Validação de acesso para usuário `@galapos.com.br`.
- Bloqueio de usuário fora do domínio permitido.
- Proteção de página interna sem sessão.
- Proteção de APIs sem sessão.

### Verificações realizadas

- `npm.cmd run lint` passou.
- `npm.cmd run build` passou.

### Observação técnica

O build manteve o aviso já conhecido do Next 16 sobre `middleware` estar deprecado em favor de `proxy`.

A migração para `proxy` permanece fora do escopo atual.

## Resultado consolidado da implementação

A feature de gestão de acessos internos foi implementada em etapas.

A implementação atual garante que a PGP seja acessível apenas por usuários internos da Galapos, conforme a decisão registrada na ADR-001.

A decisão inicial de autenticação usava Auth.js/NextAuth com Google OAuth, conforme a ADR-002, mas foi substituída pela ADR-003, que define Microsoft Entra ID/Azure AD como provider de autenticação.

A migração para Microsoft Entra ID/Azure AD foi implementada e validada manualmente.

### Funcionalidades implementadas

- Autenticação com Auth.js/NextAuth e Microsoft Entra ID/Azure AD conforme a ADR-003.
- Validação centralizada de domínio permitido.
- Bloqueio de usuários com e-mail externo.
- Proteção da rota `/dashboard`.
- Página `/access-denied` para usuários autenticados sem permissão.
- Proteção de APIs de usuário final.
- Proteção de rotas de debug.
- Proteção da rota de rebuild.
- Preservação do uso de `CRON_SECRET` para chamadas automatizadas.
- Permissão de rebuild manual apenas para usuário interno autenticado.

### Critérios de aceite atendidos

- Usuários não autenticados não conseguem acessar `/dashboard`.
- Usuários com e-mail `@galapos.com.br` conseguem acessar a plataforma.
- Usuários com e-mail externo são bloqueados.
- APIs internas relevantes estão protegidas.
- Cron/rebuild continua funcionando com `CRON_SECRET`.
- A regra de domínio está centralizada.
- Há fluxo de login e bloqueio de acesso externo.
- A aplicação continua funcionando em build.

### Verificações finais

As etapas de implementação registraram execução bem-sucedida de:

- `npm.cmd run lint`
- `npm.cmd run build`

### Pendências fora do escopo atual

- Migração de `middleware.ts` para `proxy`, conforme aviso do Next 16.
- RBAC/perfis internos avançados.
- Auditoria de acessos.
- Gestão administrativa de usuários.
- Acesso para parceiros externos.
- Exportações ou compartilhamento externo.

## Evolução futura de acesso

Evoluções já tratadas em fases e ADRs subsequentes:

- camadas de acesso `Admin`, `Galapos` e `Parceiro`: especificado em `access-layers.md` e ADR-004.
- persistência de acessos via Dataverse: ADR-006.
- autenticação de parceiros externos — remoção da restrição de domínio: decisão em ADR-007, implementação pendente.

Ainda pendentes e fora do escopo atual:

- múltiplos providers de autenticação para parceiros sem conta Microsoft.
- portal externo para parceiros ou assessores.
- auditoria completa de acessos.

Essas evoluções exigirão novas specs e ADRs antes de qualquer implementação.

## Ordem sugerida de implementação

1. Registrar decisão técnica em ADR.
2. Adicionar dependências necessárias.
3. Implementar configuração de autenticação.
4. Implementar login/logout.
5. Criar validação centralizada de domínio.
6. Proteger páginas internas.
7. Proteger APIs internas.
8. Preservar fluxo de cron com `CRON_SECRET`.
9. Testar com usuário Galapos.
10. Testar com usuário externo.
