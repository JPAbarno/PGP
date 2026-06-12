# Domínio: Usuários, Camadas de Acesso e Escopo por Parceiro

## Objetivo

Definir o modelo de domínio para usuários, camadas de acesso e associação entre usuários e parceiros/escritórios na PGP.

Este documento é a fonte de verdade para as regras de acesso que serão usadas nas features de camadas de acesso e unificação do Portal do Assessor.

## Contexto

A PGP começou como uma plataforma interna da Galapos para análise de performance de parcerias.

Com a evolução do produto, a plataforma passará a contemplar também o Portal do Assessor, voltado para usuários externos vinculados a escritórios parceiros.

A plataforma deverá suportar três camadas principais de acesso:

- `Admin`
- `Galapos`
- `Parceiro`

A camada define o que o usuário pode fazer.

O escopo por parceiro define quais dados o usuário pode visualizar.

Esses dois conceitos devem ser tratados separadamente.

## Conceitos principais

### Usuário

Pessoa autenticada na plataforma.

Um usuário possui:

- e-mail;
- camada de acesso;
- status;
- associação a parceiro conforme a camada.

Usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos, deve ser bloqueado por padrão.

Para `Admin` e `Galapos`, associação a parceiro não é necessária.

Para `Parceiro`, associação a exatamente um parceiro é obrigatória.

### Status

Define se o usuário pode acessar a plataforma.

Status previstos:

- `ativo`
- `inativo`

Usuários `inativo` devem ser bloqueados em todas as páginas, APIs e ações, independentemente da camada.

### Camada de acesso

Define o nível de permissão funcional do usuário.

Camadas previstas:

- `Admin`
- `Galapos`
- `Parceiro`

### Escopo por parceiro

Define quais dados de parceiro o usuário pode visualizar.

Escopos previstos:

- `all`: usuário pode visualizar dados de todos os parceiros.
- `partner`: usuário pode visualizar apenas dados do parceiro/escritório associado.

Matriz válida entre camada e escopo:

| Camada | Escopo válido |
|--------|---------------|
| `Admin` | `all` |
| `Galapos` | `all` |
| `Parceiro` | `partner` |

Combinações fora dessa matriz são inválidas.

### Parceiro/Escritório

`Parceiro` é o termo canônico do domínio.

`Escritório parceiro` pode ser usado como sinônimo de negócio, mas a documentação e a implementação devem preferir o termo `Parceiro`.

Na primeira versão, a associação usuário-parceiro será feita pelo nome canônico do parceiro na base/snapshot atual.

Quando possível, a comparação deve prever normalização mínima de:

- espaços;
- maiúsculas/minúsculas;
- acentos.

Enquanto não existir um ID estável de parceiro, se um parceiro for renomeado na base/snapshot, a associação na Gestão de Acessos deve ser revisada manualmente.

## Camadas de acesso

### Admin

Usuário responsável pela gestão da ferramenta.

Pode:

- acessar Gestão do Canal;
- acessar Portal do Assessor;
- acessar Configurações;
- acessar Gestão de Acessos;
- visualizar dados de todos os parceiros;
- selecionar qualquer parceiro ao visualizar o Portal do Assessor;
- cadastrar usuários;
- editar usuários;
- ativar ou inativar usuários;
- definir camada de acesso;
- associar usuário externo a parceiro/escritório;
- remover acesso;
- rodar rebuild;
- futuramente visualizar auditoria.

Escopo por parceiro:

- `all`

Regras administrativas de segurança:

- um `Admin` não pode inativar, remover ou rebaixar a si mesmo;
- o sistema não pode permitir remover, inativar ou rebaixar o último `Admin` ativo.

### Galapos

Usuário interno da Galapos.

Pode:

- acessar Gestão do Canal;
- acessar Portal do Assessor;
- acessar Configurações em modo leitura;
- acessar Gestão de Acessos em modo leitura;
- visualizar dados de todos os parceiros;
- selecionar qualquer parceiro ao visualizar o Portal do Assessor;
- rodar rebuild.

Pode rodar rebuild, mas não pode alterar configurações ou permissões.

Não pode:

- cadastrar usuários;
- editar usuários;
- ativar ou inativar usuários;
- alterar permissões;
- remover acesso.

Escopo por parceiro:

- `all`

### Parceiro

Usuário externo vinculado a um escritório parceiro.

Pode:

- acessar apenas o Portal do Assessor;
- visualizar apenas dados do parceiro/escritório associado;
- visualizar pipeline comercial;
- visualizar clientes/projetos em andamento;
- visualizar relatório de comissões;
- acessar formulário HubSpot embedded para envio de novas oportunidades.

Não pode:

- acessar Gestão do Canal;
- acessar Configurações;
- acessar Gestão de Acessos;
- visualizar dados de outros parceiros;
- trocar o filtro de parceiro;
- rodar rebuild;
- alterar permissões;
- acessar rotas administrativas ou de debug.

Escopo por parceiro:

- `partner`

## Regra crítica de segurança

Usuários da camada `Parceiro` nunca podem acessar dados de outro parceiro.

Essa regra deve ser aplicada no servidor, nas APIs e na camada de dados.

Não é suficiente esconder filtros ou menus no frontend.

Mesmo que um usuário parceiro tente alterar query params, URLs ou chamadas de API manualmente, o backend deve restringir os dados ao parceiro associado ao usuário autenticado.

O escopo de dados permitido deve ser determinado no servidor a partir do parceiro associado ao usuário autenticado. Identificadores, filtros ou nomes de parceiro enviados pelo frontend — incluindo query params, URL e identificadores no corpo da requisição, como `dealId` — não são fonte confiável de autorização e nunca devem definir, sozinhos, quais dados o usuário pode acessar.

Quando uma requisição referenciar múltiplos itens e qualquer um deles estiver fora do escopo permitido do usuário, a requisição inteira deve falhar fechado e ser negada, sem retornar resultado parcial.

Usuários autenticados, mas não cadastrados/gerenciados na persistência de acessos, devem ser bloqueados por padrão.

Usuários inativos devem ser bloqueados em todas as páginas, APIs e ações, independentemente da camada.

## Associação usuário-parceiro

Usuários `Parceiro` devem possuir exatamente um parceiro/escritório associado.

Na primeira versão:

- a associação será feita pelo nome do parceiro/escritório;
- esse nome deve corresponder ao nome usado na base/snapshot atual;
- um usuário parceiro não poderá representar mais de um parceiro;
- um parceiro poderá ter múltiplos usuários associados.

Se um usuário da camada `Parceiro` não tiver parceiro associado, ele pode até autenticar, mas não deve acessar o Portal do Assessor.

Nesse caso, o sistema deve retornar acesso negado ou exibir uma tela de pendência de configuração.

O usuário `Parceiro` deve visualizar apenas o nome do parceiro associado, sem poder alterar o filtro.

## Gestão de Acessos

A plataforma deverá prever uma seção de Configurações chamada `Gestão de Acessos`.

Essa seção deve permitir que usuários `Admin`:

- cadastrem usuários;
- editem usuários;
- definam camada de acesso;
- associem parceiro/escritório;
- ativem ou inativem usuários;
- removam acesso;
- busquem usuários cadastrados.

Na primeira versão, `remover acesso` significa inativar o usuário, não deletar o registro.

Regras administrativas:

- um `Admin` não pode inativar, remover ou rebaixar a si mesmo;
- o sistema não pode permitir remover, inativar ou rebaixar o último `Admin` ativo.

Usuários `Galapos` podem acessar essa seção apenas em modo leitura.

Usuários `Parceiro` não podem acessar essa seção.

Configurações em modo leitura para `Galapos` não devem exibir secrets, tokens, credenciais ou variáveis sensíveis.

## Campos mínimos de um usuário gerenciado

A primeira versão da Gestão de Acessos deve prever os seguintes campos:

- e-mail;
- camada de acesso;
- parceiro/escritório associado, quando aplicável;
- status ativo/inativo.

## Persistência

A Gestão de Acessos exige persistência própria para usuários, camadas, status e associação usuário-parceiro.

A solução não deve depender apenas de:

- `.env`;
- listas hardcoded no código;
- alterações manuais no repositório;
- configuração exclusiva no Microsoft Entra ID.

A tecnologia de persistência ainda não está definida.

A escolha da tecnologia deve ser registrada em ADR futura antes da implementação.

## Navegação por camada

### Admin

Menu previsto:

- Gestão do Canal
- Portal do Assessor
- Configurações
  - Gestão de Acessos

### Galapos

Menu previsto:

- Gestão do Canal
- Portal do Assessor
- Configurações
  - Gestão de Acessos em modo leitura

### Parceiro

Menu previsto:

- Portal do Assessor

## Portal do Assessor por camada

### Admin e Galapos

Ao acessar o Portal do Assessor, devem selecionar obrigatoriamente qual parceiro visualizar.

Podem visualizar dados de qualquer parceiro.

### Parceiro

Ao acessar o Portal do Assessor, o parceiro associado deve ser definido automaticamente pelo sistema.

O filtro de parceiro deve ficar travado ou oculto.

O usuário parceiro não deve conseguir trocar o parceiro visualizado.

O usuário parceiro deve visualizar apenas o nome do parceiro associado, sem poder alterar o filtro.

## Rotas e APIs de debug

Rotas e APIs de debug devem ser restritas a `Admin`.

Usuários `Galapos` e `Parceiro` não devem acessar rotas ou APIs de debug.

## Formulário HubSpot embedded

O formulário HubSpot embedded deve estar disponível para usuários com acesso ao Portal do Assessor.

Na primeira implementação, o formulário HubSpot embedded deve ser migrado de forma simples.

Não faz parte da primeira implementação travar, pré-preencher ou validar parceiro no formulário.

O risco de envio em nome de parceiro incorreto deve ser reconhecido como ponto futuro.

Validação, travamento ou pré-preenchimento por parceiro devem ser tratados em spec futura.

## Autenticação de parceiros externos

O modelo deve suportar, no futuro, usuários externos com domínios próprios e autenticação via provedores como Microsoft ou Google.

Essa capacidade deve ser prevista no desenho de acesso, mas a implementação completa de múltiplos providers externos fica fora do escopo imediato.

## Auditoria

No futuro, o sistema deverá registrar:

- quem acessou informações sensíveis;
- quem rodou rebuild;
- quem criou ou alterou permissões;
- quem ativou ou inativou usuários.

Auditoria fica fora do escopo da primeira implementação das camadas de acesso.

## Política de resposta

Respostas esperadas para falhas de acesso:

- `401`: usuário não autenticado.
- `403`: usuário autenticado sem permissão.
- `403`: usuário inativo.
- `403`: usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos.
- `403`: usuário `Parceiro` sem associação válida a parceiro.

Além das falhas de acesso acima, as APIs protegidas devem seguir o seguinte contrato de resposta:

- `400`: requisição malformada (payload inválido).
- `500`: erro técnico inesperado deve retornar resposta genérica, sem expor detalhes sensíveis, mensagens internas, tokens ou respostas brutas de integrações externas.

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

## Fora do escopo imediato

Não faz parte da primeira implementação:

- escolha da tecnologia de banco/persistência;
- auditoria completa;
- múltiplos providers externos funcionando em produção;
- portal público aberto;
- exportação de relatórios;
- permissões por cliente individual;
- associação de um usuário parceiro a múltiplos parceiros;
- RBAC granular por ação individual.

## Decisões pendentes

Ainda precisam ser definidas em specs ou ADRs futuras:

- tecnologia de persistência;
- formato exato das tabelas ou entidades;
- fluxo de convite de usuários externos;
- provider de autenticação para usuários parceiros externos;
- política de auditoria;
- política de expiração ou revisão de acessos.
