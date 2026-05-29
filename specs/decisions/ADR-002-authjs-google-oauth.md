# ADR-002 — Autenticação com Auth.js/NextAuth e Google OAuth

## Status

Substituída pela ADR-003.

## Nota de substituição

Durante os testes manuais da autenticação, foi identificado que os usuários corporativos `@galapos.com.br` utilizam contas Microsoft, não contas Google.

Por isso, a decisão de usar Google OAuth foi substituída pela ADR-003, que define Microsoft Entra ID/Azure AD como provider de autenticação.

A ADR-002 permanece registrada apenas como histórico da decisão inicial.

## Contexto

A PGP é uma plataforma interna da Galapos para análise de resultado e performance de parcerias.

Conforme a ADR-001, a plataforma será usada apenas por pessoas internas da Galapos nesta fase.

Atualmente, a aplicação não possui autenticação de usuário final.

A PGP precisa de uma solução de autenticação compatível com:

- Next.js App Router;
- TypeScript;
- login com conta Google;
- restrição de acesso por domínio corporativo;
- baixo custo operacional inicial;
- possibilidade de evolução futura.

## Decisão

Usar Auth.js/NextAuth com Google OAuth como solução inicial de autenticação.

A autenticação deve permitir login via Google e bloquear qualquer usuário cujo e-mail não pertença ao domínio:

- `@galapos.com.br`

## Regras de acesso

- Usuários não autenticados não podem acessar páginas internas.
- Usuários autenticados com e-mail `@galapos.com.br` podem acessar a aplicação.
- Usuários autenticados com e-mail externo devem ser bloqueados.
- A validação de domínio deve ser centralizada.
- APIs internas que retornam dados sensíveis devem validar sessão ou segredo de serviço, conforme o caso.

## Consequências positivas

- Usa um padrão conhecido no ecossistema Next.js.
- Permite autenticação com Google sem criar login/senha próprio.
- Reduz necessidade de gerenciar credenciais de usuários.
- Pode funcionar sem banco de dados inicialmente, usando estratégia de sessão JWT, se suficiente para o estágio atual.
- Evita dependência de uma plataforma externa paga de autenticação nesta fase.

## Consequências negativas ou limitações

- Exige configuração no Google Cloud Console.
- Exige variáveis de ambiente seguras.
- Exige atenção à proteção de API routes, não apenas páginas.
- Fluxos mais avançados, como RBAC, auditoria e gestão administrativa de usuários, precisarão de specs futuras.

## Alternativas consideradas

### Clerk

Alternativa considerada por facilitar implementação e gestão de usuários.

Não escolhida nesta fase para reduzir dependência de plataforma externa e manter maior controle dentro do projeto.

### Supabase Auth

Alternativa possível, mas menos necessária neste momento porque o requisito principal é login Google com restrição de domínio, não uma plataforma completa de backend/auth/database.

### Autenticação própria

Rejeitada nesta fase por aumentar complexidade, risco de segurança e manutenção.

## Requisitos de implementação

A implementação deve considerar:

- criação da configuração Auth.js/NextAuth;
- uso do provider Google;
- configuração das variáveis de ambiente necessárias;
- criação das rotas de autenticação;
- proteção de páginas internas;
- proteção de APIs internas;
- manutenção do fluxo de cron com `CRON_SECRET`;
- logout visível na interface, se aplicável;
- tela ou mensagem de acesso negado para e-mails externos.

## Variáveis de ambiente previstas

Os nomes exatos podem variar conforme a versão adotada do Auth.js/NextAuth, mas a implementação deve prever variáveis equivalentes a:

- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `AUTH_URL`
- `ALLOWED_EMAIL_DOMAIN=@galapos.com.br`
- `CRON_SECRET`

## Arquivos provavelmente afetados

- `package.json`
- `auth.ts`
- `middleware.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `app/layout.tsx`
- `app/page.tsx`
- `app/dashboard/page.tsx`
- `app/api/**/route.ts`
- `components/portal-shell.tsx`

## Fora do escopo desta decisão

Esta ADR não define:

- perfis internos avançados;
- RBAC;
- gestão administrativa de usuários;
- acesso para parceiros externos;
- auditoria completa de login;
- armazenamento persistente de usuários em banco.

Esses temas devem ser tratados em specs futuras, se necessário.
