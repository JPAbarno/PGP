# ADR-003 — Autenticação com Auth.js/NextAuth e Microsoft Entra ID

## Status

Aceita.

## Contexto

A PGP é uma plataforma interna da Galapos para análise de resultado e performance de parcerias.

A decisão anterior, registrada na ADR-002, previa autenticação com Auth.js/NextAuth e Google OAuth.

Durante os testes manuais, foi identificado que os usuários corporativos `@galapos.com.br` utilizam contas Microsoft, não contas Google.

Portanto, a decisão de usar Google OAuth não atende adequadamente à realidade operacional da Galapos.

A regra de produto permanece a mesma: a PGP deve ser acessível apenas por usuários internos da Galapos.

## Decisão

Substituir o provider de autenticação de Google OAuth para Microsoft Entra ID/Azure AD, mantendo Auth.js/NextAuth como biblioteca de autenticação.

A autenticação deve permitir login com conta Microsoft corporativa e bloquear usuários cujo e-mail não pertença ao domínio:

- `@galapos.com.br`

## Relação com decisões anteriores

Esta ADR substitui a ADR-002.

A ADR-002 deve permanecer registrada como histórico da decisão inicial, mas seu status deve ser alterado para `Substituída pela ADR-003`.

## Regras de acesso mantidas

- Usuários não autenticados não podem acessar páginas internas.
- Usuários autenticados com e-mail `@galapos.com.br` podem acessar a aplicação.
- Usuários autenticados com e-mail externo devem ser bloqueados.
- A validação de domínio deve permanecer centralizada.
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

No futuro, a PGP poderá considerar:

- acesso para assessores;
- diferentes camadas de acesso;
- perfis internos e externos;
- permissões por tipo de usuário;
- múltiplos providers de autenticação;
- portal externo para parceiros ou assessores.

Essas evoluções exigirão novas specs e ADRs antes de qualquer implementação.
