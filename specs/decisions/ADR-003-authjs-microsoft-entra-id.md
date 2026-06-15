# ADR-003 — Autenticação com Auth.js/NextAuth e Microsoft Entra ID

## Status

Aceita.

A ADR-007 define a remoção parcial da restrição de domínio `@galapos.com.br` para suportar autenticação de parceiros externos. A implementação está pendente. A decisão de usar Auth.js/NextAuth com Microsoft Entra ID permanece válida.

## Contexto

A PGP é uma plataforma interna da Galapos para análise de resultado e performance de parcerias.

A decisão anterior, registrada na ADR-002, previa autenticação com Auth.js/NextAuth e Google OAuth.

Durante os testes manuais, foi identificado que os usuários corporativos `@galapos.com.br` utilizam contas Microsoft, não contas Google.

Portanto, a decisão de usar Google OAuth não atende adequadamente à realidade operacional da Galapos.

A regra de produto permanece a mesma: a PGP deve ser acessível apenas por usuários internos da Galapos.

## Decisão

Substituir o provider de autenticação de Google OAuth para Microsoft Entra ID/Azure AD, mantendo Auth.js/NextAuth como biblioteca de autenticação.

A autenticação deve permitir login com conta Microsoft corporativa.

Na fase inicial, bloqueava usuários cujo e-mail não pertencesse ao domínio `@galapos.com.br`. A ADR-007 define a remoção dessa restrição na Fase 3 para suportar parceiros externos. Implementação pendente.

## Relação com decisões anteriores

Esta ADR substitui a ADR-002.

A ADR-002 deve permanecer registrada como histórico da decisão inicial, mas seu status deve ser alterado para `Substituída pela ADR-003`.

## Regras de acesso mantidas

- Usuários não autenticados não podem acessar páginas internas.
- Auth.js/Entra ID continua responsável por autenticar a identidade do usuário.
- A ADR-007 define a remoção da restrição de domínio `@galapos.com.br` do callback `signIn` e do middleware. A implementação da Fase 3 deverá realizar essa remoção. A autorização passará a ser responsabilidade do Dataverse via `getManagedAccessDecision()`.
- APIs internas que retornam dados sensíveis devem continuar validando sessão ou segredo de serviço, conforme o caso.
- O fluxo de cron com `CRON_SECRET` deve ser preservado.

## Consequências positivas

- Alinha a autenticação da PGP ao provedor real das contas corporativas Galapos.
- Mantém o uso de Auth.js/NextAuth já implementado no projeto.
- Evita exigir que usuários Galapos criem ou usem contas Google.
- Melhora governança e aderência ao ambiente corporativo.
- Permite evolução futura para SSO corporativo, políticas do tenant e camadas de acesso.

## Consequências negativas ou limitações

- Exige configuração de App Registration no Microsoft Entra ID.
- Exige novas variáveis de ambiente específicas para autenticação Microsoft.
- Exige cuidado para não misturar credenciais de login de usuário com credenciais Azure já usadas para Power BI.
- Pode exigir ajuste no mapeamento do e-mail, pois o Microsoft Entra ID pode retornar `email`, `preferred_username` ou `upn`, dependendo da configuração.

## Variáveis de ambiente previstas

A implementação deve evitar reutilizar variáveis Azure já usadas para integrações de serviço, como Power BI.

Variáveis recomendadas para autenticação de usuário:

- `AUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_MICROSOFT_ENTRA_ID`
- `AUTH_MICROSOFT_ENTRA_SECRET`
- `AUTH_MICROSOFT_ENTRA_TENANT_ID`
- `ALLOWED_EMAIL_DOMAIN=galapos.com.br`
- `CRON_SECRET`

As variáveis abaixo deixarão de ser usadas para autenticação:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`

## Callback URL prevista

Para desenvolvimento local, a callback URL prevista é:

- `http://localhost:3000/api/auth/callback/azure-ad`

Para produção:

- `https://<dominio-producao>/api/auth/callback/azure-ad`

O sufixo exato da callback deve refletir o provider usado no NextAuth v4.

## Fora do escopo desta decisão

Esta ADR não implementa:

- múltiplos providers de login;
- login com Facebook;
- login com Google para usuários externos;
- login por e-mail/senha próprio;
- acesso para assessores externos;
- portal de parceiros;
- RBAC avançado;
- auditoria completa de acessos.

Esses temas podem ser tratados em specs futuras.

## Evolução futura

Evoluções já tratadas em ADRs e specs subsequentes:

- camadas de acesso `Admin`, `Galapos` e `Parceiro`: ADR-004 e `access-layers.md`.
- persistência via Dataverse: ADR-006.
- autenticação de parceiros externos com remoção da restrição de domínio: ADR-007.

Ainda pendentes:

- múltiplos providers de autenticação para parceiros sem conta Microsoft.
- portal externo para parceiros ou assessores.
- auditoria completa de acessos.

Essas evoluções exigirão novas specs e ADRs antes de qualquer implementação.
