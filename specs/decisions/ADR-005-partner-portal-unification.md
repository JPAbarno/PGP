# ADR-005 — Unificação do Portal do Assessor na PGP

## Status

Aceita.

## Contexto

A PGP é a plataforma de gestão de parcerias da Galapos.

Até este momento, a PGP estava focada principalmente na visão interna da Galapos sobre a performance e os resultados dos parceiros.

Existe também o projeto `PortalAssessor`, que apresenta uma visão voltada ao parceiro/assessor, com funcionalidades como pipeline comercial, clientes/projetos em andamento, receita, NFs, comissões e envio de oportunidades via formulário HubSpot embedded.

O `PortalAssessor` possui stack semelhante à PGP e utiliza a mesma base de dados e integrações principais, especialmente HubSpot e Power BI.

Com a evolução do produto, manter os dois projetos separados aumenta duplicidade de código, duplicidade de integrações, risco de inconsistência e complexidade operacional.

## Decisão

Incorporar o `PortalAssessor` como um módulo dentro da PGP.

O módulo será chamado:

- `Portal do Assessor`

E deverá ser acessado pela rota base:

- `/portal-assessor`

`/portal-assessor` será a landing operacional do módulo.

Para usuários `Admin` e `Galapos`, a landing exige seleção obrigatória de parceiro antes de visualizar dados.

Para usuários `Parceiro`, o parceiro será definido automaticamente pela associação do usuário.

A PGP passará a concentrar dois módulos principais:

- `Gestão do Canal`
- `Portal do Assessor`

A navegação e o acesso serão controlados pelo modelo de camadas definido na ADR-004.

## Objetivo da unificação

A unificação busca:

- reduzir duplicidade entre projetos;
- compartilhar autenticação e autorização;
- reutilizar integrações com HubSpot e Power BI;
- permitir uma experiência única dentro da PGP;
- aplicar controle de acesso por camada;
- aplicar escopo por parceiro no backend;
- preparar a plataforma para usuários externos vinculados a parceiros.

## Módulo Gestão do Canal

Representa o dashboard atual da PGP.

Foco:

- visão interna da Galapos;
- performance dos parceiros;
- resultados;
- rankings;
- acompanhamento geral do canal.

Público:

- `Admin`
- `Galapos`

## Módulo Portal do Assessor

Representa a incorporação do projeto `PortalAssessor`.

Foco:

- visão do parceiro sobre seus próprios dados;
- pipeline comercial;
- clientes/projetos em andamento;
- relatório de receita, NFs e comissões;
- envio de novas oportunidades.

Público:

- `Admin`
- `Galapos`
- `Parceiro`, com escopo limitado ao parceiro associado.

## Rotas previstas

O módulo será incorporado sob:

- `/portal-assessor`

Rotas finais de tela:

- `/portal-assessor`
- `/portal-assessor/pipeline`
- `/portal-assessor/clientes`
- `/portal-assessor/comissoes`
- `/portal-assessor/enviar-oportunidade`

As rotas finais de tela devem permanecer em português.

As rotas antigas do projeto `PortalAssessor` não serão recriadas na raiz da PGP.

Não criar como rotas finais na PGP:

- `/dashboard`
- `/clients`
- `/nfs`
- `/enviar-oportunidade`

## APIs previstas

As APIs migradas do `PortalAssessor` devem ser obrigatoriamente agrupadas sob:

- `/api/portal-assessor/*`

APIs finais previstas, com nomes técnicos em inglês:

- `/api/portal-assessor/partners`
- `/api/portal-assessor/deals`
- `/api/portal-assessor/clients`
- `/api/portal-assessor/invoices`

`/api/portal-assessor/partners` deve retornar:

- todos os parceiros para `Admin` e `Galapos`;
- apenas o parceiro associado para `Parceiro`.

Rotas e APIs de debug não fazem parte da primeira implementação do Portal do Assessor.

Se rotas ou APIs de debug forem migradas futuramente, devem ser acessíveis apenas por `Admin`.

## Regra crítica

A unificação só será considerada segura se o escopo por parceiro for aplicado no backend.

Usuários `Parceiro` não podem depender apenas de filtro visual na interface.

Mesmo que um usuário tente manipular query params ou chamar APIs manualmente, o backend deve retornar apenas dados do parceiro/escritório associado ao usuário autenticado.

Para usuário `Parceiro`, query param de parceiro divergente deve retornar `403`, não ser ignorado silenciosamente.

As APIs do Portal do Assessor devem validar:

- sessão;
- camada;
- status;
- usuário gerenciado;
- matriz camada/escopo;
- escopo por parceiro.

Matriz válida entre camada e escopo:

| Camada | Escopo válido |
|--------|---------------|
| `Admin` | `all` |
| `Galapos` | `all` |
| `Parceiro` | `partner` |

Combinações fora dessa matriz são inválidas.

Usuário autenticado, mas não cadastrado/gerenciado na persistência de acessos, não pode acessar o Portal do Assessor nem suas APIs.

Usuários inativos devem ser bloqueados em páginas, APIs e ações do Portal do Assessor, independentemente da camada.

Usuário `Parceiro` sem associação válida pode autenticar, mas deve receber `403` ou tela de pendência/acesso negado ao tentar acessar o Portal do Assessor.

## Formulário HubSpot embedded

O formulário HubSpot embedded será migrado de forma simples na primeira implementação.

O formulário deve ficar acessível aos usuários com acesso ao Portal do Assessor.

Travamento, pré-preenchimento ou validação específica de parceiro no formulário HubSpot embedded ficam fora desta decisão e da primeira implementação.

O risco de envio em nome de parceiro incorreto deve ser reconhecido como ponto futuro.

Essas regras podem ser tratadas em spec futura.

## Política de resposta

A política de resposta deve seguir a spec de unificação do Portal do Assessor, incluindo `401` para usuário não autenticado e `403` para falhas de permissão, status, usuário gerenciado, associação válida ou escopo de parceiro.

## Consequências positivas

- Reduz duplicidade entre PGP e `PortalAssessor`.
- Permite reaproveitamento de autenticação, shell, navegação e integrações.
- Cria uma experiência mais consistente para usuários internos e externos.
- Facilita evolução do produto em uma única base.
- Permite aplicar as camadas `Admin`, `Galapos` e `Parceiro`.
- Prepara a PGP para uso controlado por parceiros externos.

## Consequências negativas ou limitações

- Aumenta a complexidade da PGP.
- Exige refatoração do código do `PortalAssessor`.
- Exige cuidado com escopo por parceiro nas APIs.
- Exige validação explícita de sessão, camada, status, usuário gerenciado, matriz camada/escopo e escopo por parceiro nas APIs do módulo.
- Exige organização de componentes e serviços hoje duplicados ou inline.
- Depende de uma decisão futura sobre persistência de usuários e permissões.
- Pode exigir ajustes em campos ou nomes de parceiros na base/snapshot.

## Alternativas consideradas

### Manter `PortalAssessor` como projeto separado

Rejeitada.

Manter projetos separados aumenta duplicidade de autenticação, autorização, integrações, deploy e manutenção.

### Copiar telas sem adaptar autorização

Rejeitada.

Copiar telas sem adaptar backend e escopo por parceiro poderia expor dados de um parceiro para outro.

### Reescrever o Portal do Assessor do zero

Adiada.

O projeto existente já funciona como protótipo. A abordagem inicial deve reaproveitar o que for útil e refatorar progressivamente.

### Unificar apenas dados, mantendo interfaces separadas

Rejeitada para a direção atual.

A decisão de produto é tornar o Portal do Assessor uma parte natural da PGP.

## Fora do escopo desta decisão

Esta ADR não define:

- tecnologia de persistência;
- implementação da Gestão de Acessos;
- modelo final das tabelas;
- autenticação de múltiplos providers externos;
- exportação de relatórios;
- auditoria;
- debug no Portal do Assessor;
- travamento, pré-preenchimento ou validação específica de parceiro no formulário HubSpot embedded;
- edição de dados pelo parceiro;
- permissões por cliente individual;
- associação de um usuário parceiro a múltiplos parceiros.

## Decisões futuras relacionadas

Deverão ser tratadas em specs ou ADRs futuras:

- escolha da tecnologia de persistência;
- estratégia de migração técnica dos componentes;
- modelo de dados de usuários e permissões;
- fluxo de convite de parceiros externos;
- política de auditoria;
- eventual exportação de relatórios;
- eventual suporte a múltiplos providers externos em produção.
