# ADR-006 — Persistência da Gestão de Acessos com Microsoft Dataverse

## Status

Aceita para primeira implementação.

## Contexto

A PGP passará a suportar camadas de acesso `Admin`, `Galapos` e `Parceiro`.

Conforme o domínio e as specs já documentadas, a plataforma precisa armazenar:

- usuários gerenciados;
- função/camada de acesso;
- status ativo/inativo;
- parceiro associado, quando aplicável;
- observações internas.

Essa informação será usada pela PGP para autorização e escopo de dados.

A autenticação continua sendo feita com Auth.js/NextAuth e Microsoft Entra ID.

O Dataverse complementa a autenticação, funcionando como fonte de verdade para autorização.

## Decisão

Usar Microsoft Dataverse como persistência inicial da Gestão de Acessos da PGP.

A PGP deve consultar o Dataverse para determinar:

- se o usuário autenticado está cadastrado/gerenciado;
- qual é sua função;
- qual é seu status;
- qual parceiro está associado ao usuário, quando aplicável.

Na primeira implementação, a integração da PGP com Dataverse será somente leitura.

A gestão dos registros será feita manualmente no Power Apps/Dataverse.

A tela de Gestão de Acessos dentro da PGP fica para fase posterior.

## Ambiente

A tabela atual está em ambiente pessoal/de trabalho dentro do diretório Galapos.

Esse ambiente será aceito para prova de conceito e primeira integração controlada.

Antes de produção definitiva, o ambiente deve ser revisado e, se necessário, migrado para ambiente corporativo/oficial da Galapos, com governança, ownership, backup e permissões adequadas.

## Tabela Dataverse

Tabela lógica:

- `cr683_pgpusuarios`

Entity set / endpoint:

- `cr683_pgpusuarioses`

URL base do Dataverse:

- `https://orga9554797.crm2.dynamics.com`

Campos principais:

- `cr683_email`
- `cr683_funcao`
- `cr683_statuspgp`
- `cr683_parceiro`
- `cr683_observacoes`

## Mapeamento de função

Campo:

- `cr683_funcao`

Valores:

- `Admin`: `608880000`
- `Galapos`: `608880001`
- `Parceiro`: `608880002`

Mapeamento interno esperado na PGP:

- `Admin` -> `admin`
- `Galapos` -> `galapos`
- `Parceiro` -> `partner`

## Mapeamento de status

Campo:

- `cr683_statuspgp`

Valores:

- `Ativo`: `608880000`
- `Inativo`: `608880001`

Mapeamento interno esperado na PGP:

- `Ativo` -> `active`
- `Inativo` -> `inactive`

## Regras de autorização

A PGP deve aplicar as seguintes regras ao consultar o Dataverse:

- se o e-mail autenticado não existir na tabela, retornar `403`;
- se o status for `Inativo`, retornar `403`;
- se a função for `Admin`, aplicar escopo `all`;
- se a função for `Galapos`, aplicar escopo `all`;
- se a função for `Parceiro`, aplicar escopo `partner`;
- se a função for `Parceiro`, `cr683_parceiro` deve estar preenchido;
- se a função for `Parceiro` e `cr683_parceiro` estiver vazio, retornar `403`;
- combinações fora da matriz função/escopo são inválidas.

## Integração técnica

A PGP deve acessar o Dataverse usando autenticação server-to-server via Microsoft Entra ID.

A integração deve usar client credentials no backend da aplicação.

A aplicação deve consultar a Dataverse Web API.

A primeira implementação deve usar permissões somente de leitura.

A App Registration usada para acesso ao Dataverse deve ser adicionada como Application User no ambiente Dataverse e receber permissões adequadas de leitura na tabela de usuários PGP.

## Variáveis de ambiente previstas

A implementação deve prever variáveis equivalentes a:

- `DATAVERSE_URL`
- `DATAVERSE_TENANT_ID`
- `DATAVERSE_CLIENT_ID`
- `DATAVERSE_CLIENT_SECRET`
- `DATAVERSE_TABLE_NAME`
- `DATAVERSE_EMAIL_COLUMN`
- `DATAVERSE_ROLE_COLUMN`
- `DATAVERSE_STATUS_COLUMN`
- `DATAVERSE_PARTNER_COLUMN`
- `DATAVERSE_NOTES_COLUMN`
- `DATAVERSE_ROLE_ADMIN`
- `DATAVERSE_ROLE_GALAPOS`
- `DATAVERSE_ROLE_PARTNER`
- `DATAVERSE_STATUS_ACTIVE`
- `DATAVERSE_STATUS_INACTIVE`

Secrets não devem ser versionados.

`.env.local` deve permanecer fora do Git.

## Validação técnica realizada

Foi realizado teste server-to-server com client credentials.

Resultado:

- token OAuth obtido com sucesso;
- consulta ao Dataverse Web API realizada com sucesso;
- consulta à tabela retornou registros;
- consulta por e-mail retornou exatamente um usuário;
- função `Admin` foi retornada como `608880000`;
- status `Ativo` foi retornado como `608880000`;
- não houve erro de autenticação;
- não houve erro de permissão.

## Consequências positivas

- Mantém a persistência dentro do ecossistema Microsoft.
- Aproveita Power Apps/Dataverse já disponível no diretório Galapos.
- Permite gestão inicial manual sem desenvolver tela administrativa imediatamente.
- Separa autenticação de autorização.
- Reduz necessidade de banco externo fora do ecossistema Microsoft.
- Prepara a futura Gestão de Acessos dentro da PGP.

## Consequências negativas ou limitações

- O ambiente atual é pessoal/de trabalho e deve ser revisado antes de produção definitiva.
- A primeira fase depende de gestão manual no Power Apps/Dataverse.
- A integração com Dataverse exige App Registration, Application User e permissões corretas.
- Campos de opção do Dataverse usam valores numéricos, exigindo mapeamento explícito no código.
- Ainda não há auditoria própria na PGP.
- Ainda não há tela de Gestão de Acessos na PGP.

## Alternativas consideradas

### `.env` ou listas hardcoded

Rejeitada.

Não permite gestão dinâmica nem tela administrativa.

### Microsoft Entra ID como única fonte

Rejeitada como solução única.

O Entra autentica usuários, mas não armazena de forma adequada a associação usuário-parceiro específica da PGP.

### Banco externo Postgres/Supabase/Neon

Não escolhido nesta fase.

Embora seja tecnicamente viável, a preferência atual é manter a persistência no ecossistema Microsoft.

### Azure SQL Database

Alternativa possível dentro do ecossistema Microsoft, mas Dataverse foi priorizado por integração com Power Apps e facilidade de gestão inicial.

## Fora do escopo desta decisão

Esta ADR não implementa:

- código de integração;
- tela de Gestão de Acessos na PGP;
- escrita no Dataverse pela PGP;
- auditoria;
- ambiente definitivo de produção;
- múltiplos parceiros por usuário;
- convite automático de usuários externos.

## Decisões futuras relacionadas

Deverão ser tratadas futuramente:

- criação de ambiente corporativo/oficial Dataverse para produção;
- definição de security role mínima para leitura da tabela;
- eventual escrita no Dataverse pela PGP;
- tela de Gestão de Acessos na PGP;
- auditoria de alterações de acesso;
- migração para IDs estáveis de parceiro.
