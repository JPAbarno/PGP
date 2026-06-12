# Feature: Camadas de Acesso

## Status

Planejada.

## Objetivo

Implementar um sistema de camadas de acesso na PGP para diferenciar permissões entre usuários `Admin`, `Galapos` e `Parceiro`.

A feature deve permitir que a plataforma evolua de um modelo simples de acesso interno Galapos para um modelo com usuários internos, usuários externos e escopo de dados por parceiro.

## Contexto

A PGP já possui autenticação com Auth.js/NextAuth e Microsoft Entra ID/Azure AD.

Atualmente, o acesso validado considera principalmente se o usuário pode acessar a plataforma.

Com a evolução do produto, será necessário controlar:

- o que cada usuário pode acessar;
- quais menus aparecem para cada camada;
- quais ações cada usuário pode executar;
- quais dados de parceiro cada usuário pode visualizar.

O modelo de domínio desta feature está documentado em:

- `/specs/domain/users-roles-and-partner-access.md`

Usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos, deve ser bloqueado por padrão.

Usuários inativos devem ser bloqueados em todas as páginas, APIs e ações.

Matriz válida entre camada e escopo:

| Camada | Escopo válido |
|--------|---------------|
| `Admin` | `all` |
| `Galapos` | `all` |
| `Parceiro` | `partner` |

Combinações fora dessa matriz são inválidas.

## Camadas previstas

### Admin

Camada responsável pela gestão da ferramenta.

Deve poder:

- acessar todas as áreas da plataforma;
- visualizar dados de todos os parceiros;
- acessar Gestão do Canal;
- acessar Portal do Assessor;
- acessar Configurações;
- acessar Gestão de Acessos;
- criar, editar, ativar, inativar e remover usuários;
- associar usuários externos a parceiros/escritórios;
- rodar rebuild;
- visualizar o Portal do Assessor selecionando qualquer parceiro.

Não deve poder:

- inativar, remover ou rebaixar a si mesmo;
- remover, inativar ou rebaixar o último `Admin` ativo.

### Galapos

Camada para usuários internos da Galapos sem permissão administrativa completa.

Deve poder:

- acessar Gestão do Canal;
- acessar Portal do Assessor;
- visualizar dados de todos os parceiros;
- selecionar qualquer parceiro ao visualizar o Portal do Assessor;
- acessar Configurações em modo leitura;
- acessar Gestão de Acessos em modo leitura;
- rodar rebuild.

Pode rodar rebuild, mas não pode alterar configurações ou permissões.

Não deve poder:

- criar usuários;
- editar usuários;
- alterar permissões;
- ativar ou inativar usuários;
- remover acesso.

### Parceiro

Camada para usuário externo vinculado a um escritório parceiro.

Deve poder:

- acessar apenas o Portal do Assessor;
- visualizar apenas dados do parceiro/escritório associado;
- acessar pipeline comercial;
- acessar clientes/projetos em andamento;
- acessar relatório de comissões;
- acessar formulário HubSpot embedded para envio de oportunidades.

O risco de envio em nome de parceiro incorreto no formulário HubSpot embedded deve ser reconhecido como ponto futuro.

Não deve poder:

- acessar Gestão do Canal;
- acessar Configurações;
- acessar Gestão de Acessos;
- acessar dados de outros parceiros;
- trocar manualmente o parceiro visualizado;
- rodar rebuild;
- acessar APIs administrativas ou de debug.

Deve visualizar apenas o nome do parceiro associado, sem conseguir alterar o filtro.

## Resumo de permissões por camada

| Permissão | Admin | Galapos | Parceiro |
|-----------|-------|---------|----------|
| Gestão do Canal | Sim | Sim | Não |
| Portal do Assessor | Sim | Sim | Sim |
| Gestão de Acessos | Sim | Leitura | Não |
| Debug | Sim | Não | Não |
| Rebuild | Sim | Sim | Não |
| Alterar permissões | Sim | Não | Não |
| Escopo de dados | `all` | `all` | `partner` |

## Requisitos funcionais

### RF-001 — Identificar camada do usuário autenticado

O sistema deve determinar a camada de acesso do usuário autenticado.

Camadas possíveis:

- `Admin`
- `Galapos`
- `Parceiro`

### RF-002 — Verificar status do usuário

O sistema deve considerar o status do usuário.

Status previstos:

- `ativo`
- `inativo`

Usuários inativos não devem acessar a plataforma.

Usuários inativos devem ser bloqueados em todas as páginas, APIs e ações, independentemente da camada.

### RF-003 — Controlar menus por camada

A navegação deve exibir apenas opções disponíveis para a camada do usuário.

Menus previstos:

Admin:

- Gestão do Canal
- Portal do Assessor
- Configurações
  - Gestão de Acessos

Galapos:

- Gestão do Canal
- Portal do Assessor
- Configurações
  - Gestão de Acessos em modo leitura

Parceiro:

- Portal do Assessor

### RF-004 — Proteger rotas por camada

O backend e as rotas devem impedir acesso indevido mesmo que o usuário tente acessar a URL diretamente.

Regras:

- `Admin` pode acessar todas as rotas.
- `Galapos` pode acessar áreas internas e leitura de configurações.
- `Parceiro` pode acessar apenas rotas do Portal do Assessor.

### RF-005 — Controlar ações administrativas

Somente `Admin` pode:

- criar usuários;
- editar usuários;
- ativar/inativar usuários;
- remover acessos;
- associar usuários a parceiros.

Remover acesso significa inativar o usuário, não deletar o registro.

O sistema deve impedir que um `Admin`:

- inative, remova ou rebaixe a si mesmo;
- inative, remova ou rebaixe o último `Admin` ativo.

### RF-006 — Permitir modo leitura para Galapos

Usuários `Galapos` podem acessar Gestão de Acessos apenas em modo leitura.

Não devem conseguir salvar alterações.

Configurações e Gestão de Acessos em modo leitura para `Galapos` não devem exibir secrets, tokens, credenciais ou variáveis sensíveis.

### RF-007 — Associar usuário Parceiro a um parceiro/escritório

Usuários `Parceiro` devem possuir exatamente um parceiro/escritório associado.

A associação será feita pelo nome do parceiro/escritório, conforme a base/snapshot atual.

Usuários `Parceiro` sem exatamente um parceiro associado devem ser tratados como sem associação válida.

### RF-008 — Filtrar dados do Parceiro no servidor

Para usuários `Parceiro`, o sistema deve aplicar filtro de parceiro no backend.

O sistema não deve confiar apenas em query params enviados pelo frontend.

Mesmo que o usuário tente alterar manualmente a URL, a API deve retornar apenas dados do parceiro associado ao usuário autenticado.

O conjunto de dados permitido deve ser montado no servidor a partir do parceiro associado ao usuário autenticado. Identificadores enviados pelo frontend, incluindo identificadores no corpo da requisição como `dealId`, não são fonte confiável de autorização.

Quando uma requisição referenciar múltiplos itens e qualquer um deles estiver fora do escopo do usuário, a requisição inteira deve falhar fechado e retornar `403`, sem resultado parcial.

### RF-009 — Permitir seleção de parceiro para Admin e Galapos

Ao acessar o Portal do Assessor, usuários `Admin` e `Galapos` devem selecionar obrigatoriamente qualquer parceiro para visualização.

### RF-010 — Travar filtro de parceiro para Parceiro

Ao acessar o Portal do Assessor, usuários `Parceiro` devem ter o parceiro definido automaticamente pelo sistema.

O filtro de parceiro deve ficar travado ou oculto.

Usuários `Parceiro` devem visualizar apenas o nome do parceiro associado, sem conseguir alterar o filtro.

### RF-011 — Negar acesso para Parceiro sem associação

Se um usuário `Parceiro` não tiver parceiro/escritório associado, ele pode autenticar, mas deve receber `403` ou tela de pendência/acesso negado ao tentar acessar o Portal do Assessor.

### RF-012 — Prever Gestão de Acessos

A plataforma deve prever uma área de Configurações chamada `Gestão de Acessos`.

A área deve permitir, para `Admin`:

- listar usuários;
- buscar usuários;
- criar usuário;
- editar usuário;
- definir camada;
- associar parceiro/escritório;
- ativar/inativar usuário;
- remover acesso.

Para `Galapos`, a área deve ser somente leitura.

`Remover acesso` significa inativar o usuário, não deletar o registro.

A área deve impedir que um `Admin`:

- inative, remova ou rebaixe a si mesmo;
- inative, remova ou rebaixe o último `Admin` ativo.

Para `Galapos`, a área em modo leitura não deve exibir secrets, tokens, credenciais ou variáveis sensíveis.

### RF-013 — Preparar suporte futuro a usuários externos

O modelo deve permitir, no futuro, usuários externos com domínios próprios e autenticação por provedores como Microsoft ou Google.

A implementação completa de múltiplos providers externos não faz parte da primeira etapa.

### RF-014 — Bloquear usuário autenticado não cadastrado

Usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos, deve ser bloqueado por padrão.

Esse usuário deve receber `403` ao tentar acessar páginas, APIs ou ações protegidas.

### RF-015 — Restringir debug a Admin

Rotas e APIs de debug devem ser acessíveis apenas por `Admin`.

Usuários `Galapos` e `Parceiro` não devem acessar rotas ou APIs de debug.

### RF-016 — Registrar tratamento futuro do formulário HubSpot embedded por parceiro

Na primeira implementação, o formulário HubSpot embedded deve ser migrado de forma simples.

O formulário deve ficar acessível aos usuários com acesso ao Portal do Assessor.

Não faz parte da primeira implementação travar, pré-preencher ou validar parceiro no formulário.

O risco de envio em nome de parceiro incorreto deve ser reconhecido como ponto futuro.

Validação, travamento ou pré-preenchimento por parceiro devem ser tratados em spec futura.

### RF-017 — Validar matriz de camada e escopo

O sistema deve aceitar apenas as combinações válidas entre camada e escopo:

| Camada | Escopo válido |
|--------|---------------|
| `Admin` | `all` |
| `Galapos` | `all` |
| `Parceiro` | `partner` |

Combinações fora dessa matriz devem ser tratadas como inválidas.

### RF-018 — Aplicar política de resposta

O sistema deve aplicar a seguinte política de resposta:

- `401` para usuário não autenticado;
- `403` para usuário autenticado sem permissão;
- `403` para usuário inativo;
- `403` para usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos;
- `403` para usuário `Parceiro` sem associação válida;
- `400` para requisição malformada (payload inválido);
- `500`, com resposta genérica, para erro técnico inesperado, sem expor detalhes sensíveis, mensagens internas, tokens ou respostas brutas de integrações externas.

## Requisitos não funcionais

- As regras de acesso devem ser aplicadas no servidor.
- A interface não deve ser a única camada de proteção.
- A lógica de permissões deve ser centralizada.
- A implementação deve evitar regras espalhadas por componentes.
- O modelo deve permitir evolução futura para auditoria.
- O modelo deve permitir evolução futura para múltiplos providers externos.
- A plataforma deve continuar compatível com Auth.js/NextAuth.
- Rotas e APIs de debug devem ser protegidas no servidor e restritas a `Admin`.
- Configurações em modo leitura não devem expor secrets, tokens, credenciais ou variáveis sensíveis.

## Persistência

Esta feature exige persistência própria para usuários, camadas, status e associação usuário-parceiro.

A tecnologia de persistência ainda não está definida.

A escolha da tecnologia será tratada em ADR futura antes da implementação.

A implementação não deve depender exclusivamente de:

- `.env`;
- listas hardcoded no código;
- Microsoft Entra ID;
- alterações manuais no repositório.

## Fora do escopo da primeira implementação

Não faz parte da primeira implementação:

- escolha final da tecnologia de banco;
- auditoria completa;
- múltiplos providers externos em produção;
- convites automáticos de usuários externos;
- permissões por cliente individual;
- associação de um usuário parceiro a múltiplos parceiros;
- RBAC granular por ação individual;
- exportação de relatórios;
- gestão de grupos via Microsoft Entra ID.

## Critérios de aceite

A feature será considerada pronta quando:

- o sistema reconhecer usuários como `Admin`, `Galapos` ou `Parceiro`;
- usuários inativos forem bloqueados em páginas, APIs e ações;
- usuários autenticados, mas não cadastrados/gerenciados na persistência de acessos, forem bloqueados;
- menus forem exibidos conforme a camada;
- rotas forem protegidas conforme a camada;
- apenas `Admin` puder alterar acessos;
- `Galapos` puder visualizar Gestão de Acessos em modo leitura;
- `Galapos` puder rodar rebuild, mas não alterar configurações ou permissões;
- Configurações e Gestão de Acessos em modo leitura não exibirem secrets, tokens, credenciais ou variáveis sensíveis;
- `Parceiro` acessar apenas o Portal do Assessor;
- dados de `Parceiro` forem filtrados no servidor;
- `Parceiro` não conseguir acessar dados de outro parceiro;
- `Admin` e `Galapos` selecionarem obrigatoriamente parceiro no Portal do Assessor;
- `Parceiro` tiver filtro de parceiro travado ou oculto;
- `Parceiro` visualizar apenas o nome do parceiro associado, sem conseguir alterar o filtro;
- usuário `Parceiro` sem parceiro associado receber `403` ou tela de pendência/acesso negado;
- rotas e APIs de debug estiverem restritas a `Admin`;
- formulário HubSpot embedded estiver migrado de forma simples e acessível aos usuários com acesso ao Portal do Assessor;
- remoção de acesso inativar o usuário sem deletar o registro;
- um `Admin` não conseguir inativar, remover ou rebaixar a si mesmo;
- o sistema não permitir remover, inativar ou rebaixar o último `Admin` ativo;
- respostas de acesso seguirem a política `401`/`403` definida nesta spec.

## Dependências

Esta feature depende de:

- autenticação existente com Auth.js/NextAuth;
- domínio de usuários e camadas documentado em `/specs/domain/users-roles-and-partner-access.md`;
- futura decisão sobre tecnologia de persistência;
- futura implementação da Gestão de Acessos;
- futura unificação do Portal do Assessor.

## Ordem sugerida de implementação

1. Definir tecnologia de persistência em ADR futura.
2. Criar modelo persistente de usuários, camadas e associação usuário-parceiro.
3. Criar funções centralizadas de autorização.
4. Adaptar sessão/autenticação para carregar camada e escopo do usuário.
5. Proteger rotas por camada.
6. Proteger APIs por camada e escopo de parceiro.
7. Criar navegação condicional por camada.
8. Criar Gestão de Acessos.
9. Implementar modo leitura para Galapos.
10. Preparar suporte ao Portal do Assessor.
11. Testar tentativas de acesso indevido por URL/API.
