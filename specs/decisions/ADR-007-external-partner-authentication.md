# ADR-007 — Evolução da Autenticação: Remoção da Restrição de Domínio e Autorização via Dataverse

## Status

Aceita.

## Contexto

A ADR-003 definiu o uso de Auth.js/NextAuth com Microsoft Entra ID como provider de autenticação, com restrição de domínio `@galapos.com.br` aplicada no callback `signIn` de `auth.ts`.

Essa restrição foi adequada para a primeira fase da plataforma, quando o acesso era exclusivamente interno à Galapos.

Com a evolução do produto para suportar as camadas de acesso definidas na ADR-004, a plataforma passará a incluir usuários externos vinculados a escritórios parceiros (camada `Parceiro`).

A ADR-006 definiu o Dataverse como persistência da Gestão de Acessos. As APIs da PGP já utilizam `getManagedAccessDecision()` para consultar o Dataverse e determinar se o usuário autenticado possui camada, status e parceiro associado válidos.

Portanto, a restrição de domínio em `auth.ts` e `middleware.ts` tornou-se uma barreira que impede parceiros externos de receber sessão — mesmo que o Dataverse já seja a fonte real de autorização e já esteja operacional.

## Problema

O callback `signIn` de `auth.ts` bloqueia o login de qualquer usuário cujo e-mail não termine com `@galapos.com.br`, impedindo que parceiros externos cadastrados e ativos no Dataverse recebam uma sessão.

O middleware aplica a mesma restrição em `/dashboard`, bloqueando o acesso de usuários com e-mail externo mesmo que estejam autenticados.

Essa dupla restrição por domínio contradiz o modelo de autorização definido nas ADR-004 e ADR-006, onde o Dataverse é a fonte de verdade para autorização, não o domínio de e-mail.

## Decisão

Remover a restrição de domínio de e-mail do callback `signIn` do Auth.js e da verificação correspondente em `middleware.ts`.

Auth.js/Entra ID passará a ser responsável exclusivamente por autenticar a identidade do usuário.

O Dataverse, via `getManagedAccessDecision()`, passará a ser a única fonte de autorização.

### Regras resultantes

- Auth.js/Entra ID autentica qualquer usuário que passe pelo fluxo OAuth do provider configurado.
- Um usuário autenticado recebe uma sessão JWT com seu e-mail.
- O middleware verifica apenas se há sessão válida. Usuário sem sessão é redirecionado para o fluxo de login. Usuário com sessão passa para a aplicação.
- O middleware não consulta o Dataverse.
- A autorização é determinada pelas APIs, que consultam o Dataverse via `getManagedAccessDecision()`.
- Usuário autenticado e cadastrado como `Admin` ou `Galapos` no Dataverse com status `ativo`: recebe acesso com escopo `all`.
- Usuário autenticado e cadastrado como `Parceiro` no Dataverse com status `ativo` e parceiro associado: recebe acesso com escopo `partner`, limitado ao seu parceiro.
- Usuário autenticado, mas não cadastrado no Dataverse: APIs retornam `403`.
- Usuário autenticado com status `inativo` no Dataverse: APIs retornam `403`.
- Usuário `Parceiro` sem parceiro associado no Dataverse: APIs retornam `403`.
- APIs falham fechado em caso de erro na consulta ao Dataverse.

## Dependência operacional — App Registration / Entra ID

Esta ADR define a mudança de código. A capacidade de autenticação de usuários externos depende, adicionalmente, da configuração do App Registration no Microsoft Entra ID.

O `tenantId` explícito atualmente configurado em `auth.ts` significa que o provider é single-tenant: somente usuários do tenant Galapos podem autenticar — incluindo Guest users adicionados via B2B.

Para que parceiros externos com contas Microsoft de outros tenants possam autenticar, uma das seguintes ações é necessária antes de qualquer teste real com parceiros:

- **Opção A — Guest B2B (preferida para controle)**: Adicionar o usuário parceiro como Guest no tenant Galapos via portal Azure. O usuário autentica com sua conta Microsoft e é convidado para o tenant Galapos. Nenhuma alteração de código necessária.
- **Opção B — Multi-tenant (amplia escopo)**: Alterar o `tenantId` para `"organizations"` ou `"common"` no App Registration. Exige avaliação de segurança adicional e nova decisão antes de implementar.
- **Opção C — Provider adicional**: Adicionar um segundo provider de autenticação para parceiros sem conta Microsoft. Exige nova spec e ADR.

A escolha da opção operacional fica fora do escopo desta ADR e deve ser registrada antes dos primeiros testes com parceiros externos reais.

## Arquivos afetados na implementação

- `auth.ts`: remover o callback `signIn` que verificava `isAllowedEmail(email)`. Manter o callback `jwt` para garantir o e-mail no token.
- `middleware.ts`: remover a verificação `isAllowedEmail(token.email)` e seu redirecionamento para `/access-denied`. Manter apenas a verificação de token ausente (usuário sem sessão → redirect para signin).

## Relação com decisões anteriores

- **ADR-003**: A restrição de domínio `@galapos.com.br` definida nessa ADR é parcialmente substituída por esta decisão. ADR-003 permanece válida quanto ao uso de Auth.js/NextAuth e Microsoft Entra ID como provider de autenticação.
- **ADR-004**: Esta ADR viabiliza o modelo de camadas de acesso definido na ADR-004, permitindo que usuários externos com camada `Parceiro` passem pelo fluxo de autenticação.
- **ADR-006**: As APIs já implementam `getManagedAccessDecision()` conforme ADR-006. A implementação desta ADR deverá remover a barreira que ainda impede o fluxo de chegar às APIs para usuários externos.

## Consequências positivas

- Parceiros externos cadastrados e ativos no Dataverse poderão autenticar e receber apenas os dados do seu parceiro.
- O modelo de autorização ficará centralizado no Dataverse, sem duplicação na camada de autenticação.
- Usuários Galapos atuais continuarão funcionando — eles são autorizados pelo Dataverse como `Admin` ou `Galapos`.
- Usuários externos não cadastrados serão bloqueados pelas APIs com `403`, sem acesso a dados.

## Consequências negativas ou limitações

- Qualquer usuário que passe pelo OAuth do Entra ID configurado pode receber uma sessão JWT, mesmo que não esteja no Dataverse. O bloqueio ocorre na camada de API, não na camada de autenticação.
- A configuração operacional do Entra ID (tenant, App Registration) torna-se dependência crítica para o acesso de parceiros externos.
- A corretude do Dataverse é crítica: se um usuário estiver cadastrado incorretamente como ativo, ele terá acesso.

## Alternativas consideradas

### Manter restrição de domínio e whitelist de e-mails externos

Rejeitada.

Exigiria manutenção manual de lista de e-mails em código ou variável de ambiente. Não é escalável. Contradiz a decisão de usar Dataverse como fonte de Gestão de Acessos.

### Mover restrição de domínio para o middleware apenas

Rejeitada.

O middleware não consulta Dataverse, conforme RNF definido em `access-layers.md`. Manter a restrição no middleware ainda impede o fluxo correto para parceiros externos. A barreira correta é nas APIs.

### Consultar Dataverse no middleware

Rejeitada.

Contradiz o requisito não funcional de `access-layers.md`: o middleware deve atuar exclusivamente como barreira leve de autenticação e navegação, sem consultar o Dataverse.

## Fora do escopo desta decisão

- Escolha da configuração de tenant do App Registration (single vs multi-tenant).
- Provider adicional para parceiros sem conta Microsoft.
- Fluxo de convite e onboarding de parceiros externos.
- Tela de Gestão de Acessos na PGP.
- Auditoria de acessos.

## Resultado do teste manual pós-Fase 3

**Data:** 2026-06-15

### Contexto

A Fase 3 foi implementada no commit `c37d6cc`. `auth.ts` e `middleware.ts` foram alterados para remover a restrição de domínio `@galapos.com.br`. Um teste manual foi realizado para verificar o fluxo de autenticação com usuário externo.

### Achado

O fluxo de login chegou corretamente ao Microsoft Entra ID. O login foi bloqueado com o erro **53003**, com a mensagem:

> A entrada teve êxito, mas não corresponde aos critérios para acessar o recurso.

O dispositivo utilizado apareceu como `Unregistered`.

### Interpretação

O erro 53003 é gerado pelo Entra ID quando a autenticação ocorre com sucesso, mas uma política de **Conditional Access** bloqueia o acesso ao recurso.

Esse erro **não é falha da implementação da Fase 3**. Indica dependência operacional de configuração do tenant:

- Conditional Access pode exigir dispositivo gerenciado ou registrado.
- O App Registration pode estar configurado como single-tenant, bloqueando usuários externos de outros tenants.
- O usuário externo pode não estar adicionado como Guest B2B no tenant Galapos.
- O UPN/e-mail retornado pelo Entra ID após autenticação bem-sucedida pode diferir do e-mail cadastrado no Dataverse.

### Status

A implementação de código da Fase 3 está pronta. O teste real com parceiro externo fica pendente de ação operacional do administrador do tenant Galapos.

Como o usuário de teste não é administrador do tenant, não foi possível consultar Sign-in logs, Conditional Access ou App Registration.

### Próximos passos operacionais

Para habilitar login externo real, o administrador do tenant Galapos deve:

1. Consultar **Sign-in logs** no Entra ID e identificar qual política de Conditional Access bloqueou o login.
2. Verificar se o usuário externo deve ser adicionado como **Guest B2B** no tenant Galapos (Opção A descrita acima).
3. Verificar se o **App Registration** precisa ser alterado para multi-tenant ou se a estratégia será Guest B2B, multi-tenant ou provider adicional.
4. Após autenticação bem-sucedida, validar qual **e-mail/UPN** chega ao token JWT.
5. Garantir que o mesmo e-mail esteja cadastrado no Dataverse com camada `Parceiro`, status `ativo` e parceiro associado.

Enquanto isso não for resolvido, testes reais com parceiro externo ficam bloqueados por dependência operacional, não por falha de código.
