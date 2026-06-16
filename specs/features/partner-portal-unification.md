# Feature: Unificação do Portal do Assessor

## Status

Planejada.

## Objetivo

Unificar o projeto `PortalAssessor` dentro da PGP como um novo módulo chamado `Portal do Assessor`.

O novo módulo deverá ser acessado pela rota:

- `/portal-assessor`

A unificação deve permitir que usuários `Admin`, `Galapos` e `Parceiro` acessem o portal conforme suas permissões e escopo de dados.

Usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos, não pode acessar o Portal do Assessor nem suas APIs.

Usuários inativos devem ser bloqueados em páginas, APIs e ações do Portal do Assessor, independentemente da camada.

Matriz válida entre camada e escopo:

| Camada | Escopo válido |
|--------|---------------|
| `Admin` | `all` |
| `Galapos` | `all` |
| `Parceiro` | `partner` |

Combinações fora dessa matriz são inválidas.

## Contexto

A PGP atualmente possui o módulo `Gestão do Canal`, voltado à visão interna da Galapos sobre performance e resultado dos parceiros.

O projeto `PortalAssessor` possui dashboards com outra perspectiva: a visão do parceiro/assessor sobre seus próprios dados.

O Portal do Assessor deve se tornar parte natural da PGP, reutilizando a mesma base de dados, autenticação e modelo de autorização.

## Diferença entre os módulos

### Gestão do Canal

Módulo atual da PGP.

Foco:

- visão da Galapos;
- análise de performance dos parceiros;
- ranking;
- resultados;
- acompanhamento geral do canal.

Público:

- `Admin`
- `Galapos`

### Portal do Assessor

Novo módulo a ser incorporado.

Foco:

- visão do parceiro sobre seus próprios dados;
- pipeline comercial;
- clientes/projetos em andamento;
- relatório de receita, NFs e comissões;
- envio de novas oportunidades via formulário HubSpot embedded.

Público:

- `Admin`
- `Galapos`
- `Parceiro`, com escopo limitado ao próprio parceiro/escritório.

## Rotas atuais do PortalAssessor

O projeto `PortalAssessor` possui atualmente:

- `/dashboard`: pipeline comercial em Kanban;
- `/clients`: carteira de contratos/clientes;
- `/nfs`: receita, NFs e comissão;
- `/enviar-oportunidade`: formulário HubSpot embedded.

## Rotas finais previstas na PGP

O módulo deve ser incorporado sob a rota base:

- `/portal-assessor`

Rotas finais previstas:

- `/portal-assessor`: landing operacional do módulo;
- `/portal-assessor/pipeline`: pipeline comercial;
- `/portal-assessor/clientes`: clientes/projetos em andamento;
- `/portal-assessor/comissoes`: receita, NFs e comissões;
- `/portal-assessor/enviar-oportunidade`: formulário HubSpot embedded.

As rotas finais de tela devem permanecer em português.

`/portal-assessor` será a landing operacional do módulo.

Para `Admin` e `Galapos`, a landing exige seleção obrigatória de parceiro antes de visualizar dados.

Para `Parceiro`, a landing usa automaticamente o parceiro associado.

Após seleção ou definição do parceiro, a landing pode redirecionar para `/portal-assessor/pipeline` ou apresentar a visão inicial do pipeline.

As rotas antigas do projeto `PortalAssessor` não devem ser recriadas na raiz da PGP.

Não criar como rotas finais na PGP:

- `/dashboard`
- `/clients`
- `/nfs`
- `/enviar-oportunidade`

Todas as telas devem ser migradas para `/portal-assessor/*`.

## Funcionalidades a migrar

### Pipeline comercial

Origem:

- `PortalAssessor` `/dashboard`

Funcionalidades:

- Kanban por etapas;
- cards expansíveis;
- filtros por escritório parceiro;
- filtro por etapa;
- busca textual;
- métricas de oportunidades, propostas enviadas, contratos fechados e perdidos.

### Clientes/projetos em andamento

Origem:

- `PortalAssessor` `/clients`

Funcionalidades:

- carteira de contratos/clientes;
- busca textual;
- ordenação por colunas;
- métricas de contratos totais, ativos, vencendo em 60 dias e vencidos.

#### Fonte de dados e semântica

`clients` representam contratos, clientes e projetos vinculados ao parceiro — não são eventos de pipeline comercial.

A fonte interna atual da API `/api/portal-assessor/clients` é `contractMetrics`, estrutura materializada no snapshot durante o rebuild. `contractMetrics` é derivada do pipeline de contratos do HubSpot e não deve ser confundida com `partnerMetrics[].deals[]`.

`partnerMetrics[].deals[]` registra atividade de pipeline comercial (reuniões, propostas, contratos fechados no pipeline de vendas) e não deve ser usada como fonte da API `/api/portal-assessor/clients`.

O campo `status` em `/clients` corresponde ao label/stage real do contrato disponível em `contractMetrics`. `status` não deve ser reinterpretado como ativo/vencido/vencendo sem campo real disponível para essa classificação.

Campo de vencimento/vigência não está disponível em `contractMetrics` e não deve ser inventado. `closeDate` e `createDate` são datas do deal no HubSpot e não representam vigência contratual. As métricas de "ativos, vencendo em 60 dias e vencidos" da listagem original do `PortalAssessor` dependem desse campo e não podem ser reproduzidas com os dados atuais.

### Receita, NFs e comissões

Origem:

- `PortalAssessor` `/nfs`

Funcionalidades:

- visão de deals com NFs;
- total de NFs;
- recebimento Galapos;
- comissão parceiro;
- gráfico mensal de comissão;
- tabela detalhada por deal/NF;
- filtros por período;
- busca textual;
- ordenação por colunas.

### Envio de oportunidades

Origem:

- `PortalAssessor` `/enviar-oportunidade`

Funcionalidade:

- formulário HubSpot embedded.

O formulário deve aparecer para todos os usuários com acesso ao Portal do Assessor, incluindo usuários `Parceiro`.

Na primeira implementação, o formulário HubSpot embedded deve ser migrado de forma simples.

Não faz parte desta fase implementar lógica específica de travamento, pré-preenchimento ou validação de parceiro no formulário.

O risco de envio em nome de parceiro incorreto deve ser reconhecido como ponto futuro.

Validação, travamento ou pré-preenchimento por parceiro podem ser tratados em spec futura.

## APIs a migrar ou adaptar

APIs atuais do `PortalAssessor`:

- `/api/parceiros`
- `/api/deals?parceiro=`
- `/api/clients?parceiro=`
- `/api/nfs?parceiro=`
- `/api/powerbi-debug`
- `/api/debug/deal-properties`
- `/api/debug/deal-by-id`

Na PGP, as APIs do Portal do Assessor devem ser obrigatoriamente agrupadas sob:

- `/api/portal-assessor/*`

APIs finais previstas:

- `/api/portal-assessor/partners`
- `/api/portal-assessor/deals`
- `/api/portal-assessor/clients`
- `/api/portal-assessor/invoices`

`/api/portal-assessor/partners` deve respeitar a camada do usuário:

- `Admin` e `Galapos` recebem todos os parceiros;
- `Parceiro` recebe apenas o parceiro associado.

Rotas de debug não fazem parte da primeira implementação do Portal do Assessor.

Se rotas de debug forem migradas futuramente, devem ser acessíveis apenas por `Admin`.

## Regra crítica de escopo por parceiro

O filtro por parceiro não pode depender apenas de query params enviados pelo frontend.

Para usuários `Admin` e `Galapos`:

- o parceiro selecionado é passado às APIs via query param `?parceiro=` na URL da requisição;
- o backend aceita qualquer valor de parceiro enviado por usuários com escopo `all`;
- o query param `?parceiro=` é mecanismo de seleção de contexto de visualização, não de autorização.

Para usuários `Parceiro`:

- o backend deve validar o parceiro enviado por query param, se houver;
- o parceiro permitido deve ser derivado da associação do usuário autenticado no Dataverse;
- a API deve retornar apenas dados do parceiro associado ao usuário;
- tentativa de acessar outro parceiro deve retornar `403`;
- o sistema não deve ignorar silenciosamente query param divergente;
- o query param `?parceiro=` nunca é fonte de autorização para `Parceiro` — o parceiro é sempre resolvido a partir do Dataverse.

### Resolução stateless de parceiro selecionado

O estado de seleção de parceiro para `Admin` e `Galapos` é stateless: é resolvido por request no servidor, a partir do query param `?parceiro=` recebido.

O parceiro selecionado não é armazenado em sessão server-side, cookie de autorização nem em estado client-side com valor de autorização.

O frontend mantém o parceiro selecionado no estado da interface e o propaga em cada requisição via query param. A cada request, o backend resolve o parceiro a partir do query param para `Admin` e `Galapos`, e a partir do Dataverse para `Parceiro`.

## Comportamento por camada

### Admin

Pode:

- acessar Portal do Assessor;
- selecionar obrigatoriamente qualquer parceiro;
- visualizar todos os dados;
- acessar todas as subseções do portal.

### Galapos

Pode:

- acessar Portal do Assessor;
- selecionar obrigatoriamente qualquer parceiro;
- visualizar todos os dados;
- acessar todas as subseções funcionais do portal.

Galapos não pode alterar permissões ou configurações. Modo leitura não permite salvar alterações.

Não pode:

- salvar alterações em áreas de modo leitura;
- acessar debug, secrets, tokens ou áreas técnicas.

### Parceiro

Pode:

- acessar Portal do Assessor;
- visualizar apenas o parceiro associado;
- visualizar apenas o nome do parceiro associado;
- acessar pipeline;
- acessar clientes/projetos em andamento;
- acessar comissões;
- enviar oportunidade via formulário HubSpot embedded.

Não pode:

- selecionar outro parceiro;
- alterar filtro de parceiro;
- acessar dados de outro parceiro;
- acessar Gestão do Canal;
- acessar Configurações;
- acessar APIs administrativas ou de debug.

Se o usuário `Parceiro` não tiver associação válida, pode autenticar, mas deve receber `403` ou tela de pendência/acesso negado ao tentar acessar o Portal do Assessor.

## Navegação

A navegação principal da PGP deverá considerar:

- Gestão do Canal
- Portal do Assessor
- Configurações

Para `Parceiro`, apenas `Portal do Assessor` deve aparecer.

Dentro do Portal do Assessor, a navegação secundária pode conter:

- Pipeline
- Clientes
- Comissões
- Enviar oportunidade

## Dados e integrações

O Portal do Assessor deve usar a mesma base de dados e integrações já utilizadas:

- HubSpot;
- Power BI;
- snapshots ou APIs já existentes, conforme compatibilidade.

A unificação não deve criar uma fonte de dados paralela sem necessidade.

Se forem necessários novos campos na base, eles devem ser documentados antes da implementação.

## Componentização esperada

Antes ou durante a migração, o código do `PortalAssessor` deve ser organizado em componentes reutilizáveis.

Candidatos:

- `PartnerSelector`
- `StatCard`
- `KanbanBoard`
- `ContractsTable`
- `RevenueTable`
- `MonthlyCommissionChart`
- `HubSpotOpportunityForm`
- `PortalAssessorNav`

Serviços/lógicas a extrair:

- cliente HubSpot;
- cliente Power BI;
- resolução de parceiros;
- formatação de moeda;
- formatação de datas;
- classificação de etapas;
- cálculo de métricas;
- autorização;
- validação de status do usuário;
- validação de usuário gerenciado;
- validação da matriz camada/escopo;
- escopo de parceiro.

## Requisitos funcionais

### RF-001 — Criar módulo Portal do Assessor

A PGP deve possuir um módulo chamado `Portal do Assessor` acessível por `/portal-assessor`.

`/portal-assessor` deve ser a landing operacional do módulo:

- para `Admin` e `Galapos`, exige seleção obrigatória de parceiro antes de visualizar dados;
- para `Parceiro`, usa automaticamente o parceiro associado;
- após seleção ou definição de parceiro, pode redirecionar ou apresentar a visão inicial do pipeline.

As rotas antigas `/dashboard`, `/clients`, `/nfs` e `/enviar-oportunidade` não devem ser recriadas na raiz da PGP.

### RF-002 — Migrar pipeline comercial

O pipeline comercial do `PortalAssessor` deve ser incorporado à PGP.

### RF-003 — Migrar carteira de clientes/projetos

A visão de clientes/projetos em andamento deve ser incorporada à PGP, servida pela API `GET /api/portal-assessor/clients`.

A fonte de dados da API é exclusivamente `contractMetrics`, materializado no snapshot. `partnerMetrics[].deals[]` não deve ser usado como fonte desta API.

A API deve aplicar filtro server-side por parceiro antes de retornar dados.

Para `Admin` e `Galapos`, o parceiro é passado via query param `?parceiro=` como contexto de visualização.

Para `Parceiro`, o parceiro é resolvido a partir da associação no Dataverse. Query param com valor divergente do parceiro associado deve retornar `403`.

Snapshot ausente, inválido ou sem `contractMetrics` deve ser tratado de forma segura pela API, retornando lista vazia sem falha crítica.

`contractMetrics` pode conter contratos de múltiplos parceiros internamente. A API nunca deve expor dados sem aplicar filtro de escopo por parceiro.

### RF-004 — Migrar relatório de comissões

A visão de receita, NFs e comissões deve ser incorporada à PGP.

### RF-005 — Migrar formulário HubSpot embedded

O formulário de envio de oportunidades deve ser incorporado à PGP.

Na primeira implementação, a migração do formulário deve ser simples.

O formulário deve ficar acessível aos usuários com acesso ao Portal do Assessor.

Não faz parte desta fase implementar travamento, pré-preenchimento ou validação específica de parceiro no formulário.

O risco de envio em nome de parceiro incorreto deve ser reconhecido como ponto futuro.

Validação, travamento ou pré-preenchimento por parceiro podem ser tratados em spec futura.

### RF-006 — Aplicar controle de acesso por camada

O acesso ao Portal do Assessor deve respeitar as camadas `Admin`, `Galapos` e `Parceiro`.

Usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos, não pode acessar o Portal do Assessor nem suas APIs.

Usuários inativos devem ser bloqueados em páginas, APIs e ações do Portal do Assessor, independentemente da camada.

A matriz válida entre camada e escopo deve ser aplicada:

| Camada | Escopo válido |
|--------|---------------|
| `Admin` | `all` |
| `Galapos` | `all` |
| `Parceiro` | `partner` |

Combinações fora dessa matriz são inválidas.

### RF-007 — Aplicar escopo por parceiro no backend

Usuários `Parceiro` só podem receber dados do parceiro associado.

Se um usuário `Parceiro` enviar query param de parceiro divergente, a API deve retornar `403`.

O sistema não deve ignorar silenciosamente query param divergente.

### RF-008 — Permitir seletor de parceiro para Admin e Galapos

Usuários `Admin` e `Galapos` devem selecionar obrigatoriamente qualquer parceiro no Portal do Assessor.

### RF-009 — Travar ou ocultar filtro para Parceiro

Usuários `Parceiro` não devem conseguir alterar o parceiro visualizado.

Usuários `Parceiro` devem visualizar apenas o nome do parceiro associado, sem controle editável de filtro.

### RF-010 — Proteger APIs do Portal do Assessor

APIs do Portal do Assessor devem validar sessão, camada, status, usuário gerenciado, matriz camada/escopo e escopo de parceiro.

As APIs finais devem ser obrigatoriamente agrupadas sob `/api/portal-assessor/*`:

- `/api/portal-assessor/partners`
- `/api/portal-assessor/deals`
- `/api/portal-assessor/clients`
- `/api/portal-assessor/invoices`

`/api/portal-assessor/partners` deve retornar todos os parceiros para `Admin` e `Galapos`, e apenas o parceiro associado para `Parceiro`.

### RF-011 — Restringir debug a Admin

Debug não faz parte da primeira implementação do Portal do Assessor.

Se rotas de debug forem migradas futuramente, devem ser acessíveis apenas por `Admin`.

### RF-012 — Reutilizar shell/navegação da PGP

O Portal do Assessor deve usar shell, autenticação e padrões visuais da PGP sempre que possível.

### RF-013 — Aplicar política de resposta

O sistema deve aplicar a seguinte política de resposta:

- `401` para usuário não autenticado;
- `403` para usuário autenticado sem permissão;
- `403` para usuário inativo;
- `403` para usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos;
- `403` para usuário `Parceiro` sem associação válida;
- `403` para usuário `Parceiro` tentando acessar parceiro divergente.

## Fora do escopo da primeira implementação

Não faz parte da primeira implementação:

- exportação de relatórios;
- auditoria completa;
- múltiplos parceiros por usuário externo;
- múltiplos providers externos em produção;
- edição de dados pelo parceiro;
- comentários/anotações;
- alteração de dados no HubSpot além do formulário embedded já existente;
- travamento, pré-preenchimento ou validação específica de parceiro no formulário HubSpot embedded;
- substituição completa das integrações existentes;
- reescrita completa dos dashboards sem necessidade;
- migração de rotas ou APIs de debug.

## Critérios de aceite

A feature será considerada pronta quando:

- `/portal-assessor` existir dentro da PGP;
- pipeline, clientes, comissões e formulário estiverem disponíveis;
- usuário inativo for bloqueado;
- usuário autenticado não cadastrado/gerenciado na persistência de acessos for bloqueado;
- Admin e Galapos selecionarem obrigatoriamente parceiro;
- Parceiro visualizar apenas o parceiro associado;
- Parceiro visualizar apenas o nome do parceiro associado, sem controle editável de filtro;
- Parceiro sem associação válida receber `403` ou tela de pendência/acesso negado;
- APIs aplicarem escopo por parceiro no servidor;
- APIs validarem sessão, camada, status, usuário gerenciado, matriz camada/escopo e escopo de parceiro;
- Parceiro não conseguir acessar dados de outro parceiro via query param;
- query param divergente para Parceiro retornar `403`;
- Parceiro não conseguir acessar Gestão do Canal;
- Parceiro não conseguir acessar Configurações;
- debug routes e APIs estiverem restritas a `Admin`;
- formulário HubSpot embedded estiver migrado e acessível aos usuários com acesso ao Portal do Assessor;
- lint e build passarem.

## Dependências

Esta feature depende de:

- `/specs/domain/users-roles-and-partner-access.md`;
- `/specs/features/access-layers.md`;
- `/specs/decisions/ADR-004-access-layer-model.md`;
- futura decisão sobre tecnologia de persistência;
- implementação das camadas de acesso;
- integração com HubSpot;
- integração com Power BI;
- inventário do projeto `PortalAssessor`.

## Ordem sugerida de implementação

1. Definir tecnologia de persistência em ADR futura.
2. Implementar modelo de camadas de acesso.
3. Implementar escopo por parceiro no backend.
4. Criar rota base `/portal-assessor`.
5. Migrar shell e navegação do Portal do Assessor para a PGP.
6. Migrar APIs sob `/api/portal-assessor/*`.
7. Migrar pipeline comercial.
8. Migrar clientes/projetos em andamento.
9. Migrar comissões.
10. Migrar formulário HubSpot embedded.
11. Aplicar seletor de parceiro para `Admin` e `Galapos`.
12. Aplicar filtro travado/oculto para `Parceiro`.
13. Testar tentativas de acesso cruzado entre parceiros.
14. Rodar lint e build.
