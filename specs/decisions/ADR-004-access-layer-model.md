# ADR-004 — Modelo de Camadas de Acesso e Escopo por Parceiro

## Status

Aceita.

## Contexto

A PGP começou como uma plataforma interna da Galapos, com acesso restrito a usuários autenticados do domínio Galapos.

Com a evolução do produto, a plataforma passará a contemplar também o Portal do Assessor, voltado para usuários externos vinculados a escritórios parceiros.

Esse novo cenário exige um modelo de acesso mais granular do que apenas permitir ou bloquear usuários autenticados.

A plataforma precisa diferenciar:

- o que cada usuário pode acessar;
- quais ações cada usuário pode executar;
- quais menus cada usuário deve visualizar;
- quais dados de parceiro cada usuário pode consultar.

## Decisão

Adotar um modelo de acesso baseado em três camadas principais:

- `Admin`
- `Galapos`
- `Parceiro`

A camada de acesso define as permissões funcionais do usuário.

O escopo por parceiro define quais dados de parceiro o usuário pode visualizar.

Esses dois conceitos devem ser tratados separadamente.

Usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos, deve ser bloqueado por padrão.

Usuários inativos devem ser bloqueados em todas as páginas, APIs e ações, independentemente da camada.

A matriz válida entre camada e escopo é:

| Camada | Escopo válido |
|--------|---------------|
| `Admin` | `all` |
| `Galapos` | `all` |
| `Parceiro` | `partner` |

Combinações fora dessa matriz são inválidas.

## Camadas definidas

### Admin

Usuário responsável pela gestão da ferramenta.

Possui acesso funcional completo.

Pode visualizar dados de todos os parceiros e gerenciar usuários, permissões e associações usuário-parceiro.

Escopo por parceiro:

- `all`

Regras administrativas de segurança:

- um `Admin` não pode inativar, remover ou rebaixar a si mesmo;
- o sistema não pode permitir remover, inativar ou rebaixar o último `Admin` ativo.

### Galapos

Usuário interno da Galapos sem permissão administrativa completa.

Pode visualizar dados de todos os parceiros, acessar Gestão do Canal, acessar Portal do Assessor e visualizar Gestão de Acessos em modo leitura.

Pode rodar rebuild, mas não pode alterar configurações ou permissões.

Não pode criar, editar, ativar, inativar ou remover usuários.

Configurações e Gestão de Acessos em modo leitura para `Galapos` não devem exibir secrets, tokens, credenciais ou variáveis sensíveis.

Escopo por parceiro:

- `all`

### Parceiro

Usuário externo vinculado a um escritório parceiro.

Pode acessar apenas o Portal do Assessor e visualizar exclusivamente dados do parceiro/escritório ao qual está associado.

Não pode acessar dados de outros parceiros.

O risco de envio em nome de parceiro incorreto no formulário HubSpot embedded deve ser reconhecido como ponto futuro.

Validação, travamento ou pré-preenchimento por parceiro devem ser tratados em spec futura.

Escopo por parceiro:

- `partner`

## Regra crítica

Usuários da camada `Parceiro` nunca podem acessar dados de outro parceiro.

Essa restrição deve ser aplicada no backend, nas APIs e na camada de dados.

A interface pode ocultar menus e filtros, mas isso não é suficiente como mecanismo de segurança.

Rotas e APIs de debug devem ser restritas a `Admin`.

## Associação usuário-parceiro

Usuários `Parceiro` devem possuir exatamente um parceiro/escritório associado.

Na primeira versão, essa associação será feita pelo nome do parceiro/escritório, utilizando o mesmo nome existente na base/snapshot atual.

Um usuário `Parceiro` não poderá representar mais de um parceiro.

Um parceiro poderá ter múltiplos usuários associados.

Usuário `Parceiro` sem associação válida pode autenticar, mas deve receber `403` ou tela de pendência/acesso negado ao tentar acessar o Portal do Assessor.

## Persistência

A Gestão de Acessos exigirá persistência própria para armazenar:

- usuários;
- camadas;
- status ativo/inativo;
- associação usuário-parceiro.

Na primeira versão, remover acesso significa inativar o usuário, não deletar o registro.

O modelo não deve depender exclusivamente de:

- `.env`;
- listas hardcoded no código;
- alterações manuais no repositório;
- configuração exclusiva no Microsoft Entra ID.

A tecnologia de persistência não será definida nesta ADR.

Ela deverá ser escolhida em ADR futura antes da implementação.

## Política de resposta

Respostas esperadas para falhas de acesso:

- `401`: usuário não autenticado.
- `403`: usuário autenticado sem permissão.
- `403`: usuário inativo.
- `403`: usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos.
- `403`: usuário `Parceiro` sem associação válida a parceiro.

## Consequências positivas

- Permite evolução da PGP para usuários internos e externos.
- Cria separação clara entre permissão funcional e escopo de dados.
- Prepara o produto para o Portal do Assessor.
- Reduz risco de exposição indevida de dados entre parceiros.
- Permite Gestão de Acessos administrável pela plataforma.
- Mantém caminho para evolução futura com auditoria e múltiplos providers.

## Consequências negativas ou limitações

- Aumenta a complexidade do modelo de autorização.
- Exige persistência própria.
- Exige proteção de APIs além da proteção de menus.
- Exige cuidado especial com filtros por parceiro.
- Exige proteção explícita de rotas e APIs de debug.
- A associação inicial por nome de parceiro pode ser menos robusta do que usar IDs estáveis.

## Alternativas consideradas

### Manter apenas domínio Galapos

Rejeitada.

Esse modelo não atende o futuro Portal do Assessor nem usuários externos.

### Controlar acesso apenas por `.env` ou listas hardcoded

Rejeitada para o modelo final.

Pode ser útil em protótipos, mas não atende a necessidade de Gestão de Acessos administrável por Admin dentro da plataforma.

### Usar apenas Microsoft Entra ID para permissões

Rejeitada como solução única.

O Entra ID pode apoiar autenticação, mas não resolve sozinho a associação específica entre usuário externo e parceiro/escritório da base da PGP.

### Permitir múltiplos parceiros por usuário externo desde o início

Adiada.

A primeira versão assume que um usuário `Parceiro` pertence a exatamente um parceiro/escritório.

## Fora do escopo desta decisão

Esta ADR não define:

- tecnologia de banco;
- formato final das tabelas;
- implementação da tela Gestão de Acessos;
- auditoria;
- múltiplos providers externos;
- permissões por cliente individual;
- associação de um usuário a múltiplos parceiros;
- RBAC granular por ação individual.

## Decisões futuras relacionadas

Deverão ser tratadas em ADRs ou specs futuras:

- escolha da tecnologia de persistência;
- modelo de dados de usuários e permissões;
- fluxo de convite de usuários externos;
- providers de autenticação para parceiros externos;
- política de auditoria;
- política de revisão de acessos;
- eventual uso de IDs estáveis de parceiro em vez de nome.
