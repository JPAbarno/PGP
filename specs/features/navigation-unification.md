# Feature: Navegação Unificada da PGP

## Status

Pendente — Bloco 5.

## Objetivo

Implementar uma navegação principal unificada que permita ao usuário transitar entre todos os módulos da PGP conforme sua camada de acesso, sem depender de URLs digitadas manualmente.

A navegação deve deixar claro que a PGP possui dois módulos principais — Gestão do Canal e Portal do Assessor — e deve adaptar os itens visíveis por camada.

## Contexto

Após o Bloco 4, a PGP possui dois módulos funcionais:

- `/dashboard`: Gestão do Canal (Admin e Galapos).
- `/portal-assessor`: Portal do Assessor (Admin, Galapos e Parceiro).

Esses módulos compartilham autenticação, autorização e dados, mas não existe um menu principal que os conecte visualmente. O usuário navega entre eles por URL direta, o que não representa uma experiência unificada.

A implementação do menu principal é pré-requisito para que a PGP possa ser apresentada como produto único — não como dois silos acessados por URL.

## Módulos do produto unificado

| Módulo | Rota base | Público |
|--------|-----------|---------|
| Gestão do Canal | `/dashboard` | Admin, Galapos |
| Portal do Assessor | `/portal-assessor` | Admin, Galapos, Parceiro |
| Configurações | `/configuracoes` | Admin (completo), Galapos (leitura) |

Dentro de Configurações:

| Sub-item | Público |
|----------|---------|
| Gestão de Acessos | Admin (completo), Galapos (somente leitura) |

## Visibilidade por camada

### Admin

Menu principal:

- Gestão do Canal
- Portal do Assessor
- Configurações
  - Gestão de Acessos

O Admin vê todos os módulos e tem acesso completo a Configurações e Gestão de Acessos.

### Galapos

Menu principal:

- Gestão do Canal
- Portal do Assessor
- Configurações
  - Gestão de Acessos (somente leitura)

O Galapos vê os mesmos itens do Admin, mas Gestão de Acessos é somente leitura.

### Parceiro

Menu principal:

- Portal do Assessor

O Parceiro não vê Gestão do Canal, Configurações nem Gestão de Acessos. Esses itens não devem aparecer no menu — não apenas estar desabilitados.

## Relação entre `/dashboard` e `/portal-assessor`

São módulos distintos com foco diferente:

- `/dashboard` (Gestão do Canal): visão interna Galapos sobre performance dos parceiros. Apenas Admin e Galapos.
- `/portal-assessor` (Portal do Assessor): visão do parceiro sobre seus próprios dados. Admin, Galapos e Parceiro.

Ambos devem aparecer no menu como itens de nível superior para Admin e Galapos.

O Parceiro só vê Portal do Assessor. O item Gestão do Canal não deve existir no menu do Parceiro.

## Menu principal esperado

O menu principal deve ser um componente de shell compartilhado entre módulos.

Estrutura visual esperada para Admin e Galapos:

```
[Gestão do Canal]  [Portal do Assessor]  [Configurações ▾]
                                          └─ Gestão de Acessos
```

Estrutura visual esperada para Parceiro:

```
[Portal do Assessor]
```

O item ativo deve ser destacado visualmente conforme a rota atual.

O menu deve ser responsivo e funcionar em mobile.

## Comportamento para Parceiro externo

O usuário Parceiro, após autenticação, deve aterrissar diretamente no Portal do Assessor.

Se tentar acessar `/dashboard` ou `/configuracoes` diretamente via URL, deve ser redirecionado ou receber `403`.

O menu não deve exibir rotas às quais o Parceiro não tem acesso.

Não expor indiretamente a existência de outros módulos (ex: não exibir itens desabilitados/cinzas que revelam que outros módulos existem).

## Navegação interna do Portal do Assessor

Dentro do Portal do Assessor, a navegação secundária (já implementada via `PortalNav`) contém:

- Pipeline
- Clientes
- Comissões
- Enviar oportunidade

Essa navegação interna não é parte desta spec — já existe. Esta spec trata apenas do menu principal de nível superior da PGP.

## Requisitos funcionais

### RF-001 — Criar componente de menu principal unificado

O shell principal da PGP deve conter um componente de menu principal que:

- exiba itens conforme a camada do usuário autenticado;
- destaque o item da rota atual;
- seja compartilhado entre todos os módulos da PGP.

### RF-002 — Diferenciar menu por camada

O menu deve mostrar itens diferentes por camada:

- Admin e Galapos: Gestão do Canal, Portal do Assessor, Configurações.
- Parceiro: apenas Portal do Assessor.

Itens de outras camadas não devem aparecer para o Parceiro — nem desabilitados.

### RF-003 — Proteger rotas por camada no servidor

A navegação condicional no frontend não é suficiente.

O servidor deve impedir que Parceiro acesse `/dashboard` ou `/configuracoes` mesmo que tente por URL direta.

O gate server-side de `/dashboard` para Admin/Galapos já existe. Complementar com gate para Parceiro tentando acessar `/dashboard`.

### RF-004 — Integrar com shell existente

O componente de menu principal deve ser integrado ao `portal-shell.tsx` ou ao layout raiz da aplicação.

Não criar shell paralelo. Adaptar o shell existente para suportar a navegação por camada.

### RF-005 — Exibir informações do usuário autenticado

O menu deve exibir o nome ou e-mail do usuário autenticado e a ação de logout.

Para Parceiro, exibir também o nome do parceiro associado.

### RF-006 — Consistência visual com Portal do Assessor

O menu principal deve ser visualmente consistente com o design dark-mode já adotado no Portal do Assessor.

## Requisitos não funcionais

- A lógica de visibilidade de itens de menu deve ser determinada server-side a partir da camada do usuário, não apenas client-side.
- O componente não deve renderizar itens de menu antes de conhecer a camada do usuário.
- Nenhum item de menu deve ser renderizado e depois ocultado via CSS — se o item não é acessível, não deve ser renderizado.

## O que é MVP

Para o Bloco 5, o MVP da navegação unificada deve entregar:

- Menu principal visível em todos os módulos da PGP.
- Itens de menu diferenciados por camada (Admin/Galapos vs. Parceiro).
- Item ativo destacado.
- Nome/e-mail do usuário e logout.
- Proteção server-side de `/dashboard` para Parceiro.

## O que é pós-MVP

- Breadcrumbs por módulo.
- Navegação mobile com drawer/hamburger.
- Indicadores de notificação em itens de menu.
- Suporte a múltiplos níveis de submenu.
- Animações de transição entre módulos.

## Critérios de aceite

A feature será considerada pronta quando:

- Usuário Admin ou Galapos, ao acessar qualquer rota da PGP, visualizar menu com Gestão do Canal, Portal do Assessor e Configurações.
- Usuário Parceiro, ao acessar qualquer rota do Portal do Assessor, visualizar menu apenas com Portal do Assessor.
- Item correspondente à rota atual estiver destacado.
- Usuário Parceiro tentando acessar `/dashboard` por URL direta for redirecionado ou receber acesso negado.
- Usuário Parceiro tentando acessar `/configuracoes` por URL direta for redirecionado ou receber acesso negado.
- Menu exibir nome/e-mail do usuário e ação de logout.
- Para Parceiro, menu exibir o nome do parceiro associado.
- Lint e build passarem.

## Dependências

- Camadas de acesso implementadas (✅ Bloco 4).
- `portal-shell.tsx` como ponto de extensão do menu.
- `getManagedAccessDecision()` para determinar camada no servidor.
- Gestão de Acessos com UI Admin não é pré-requisito para esta feature, mas ambas compõem o Bloco 5.

## Decisões em aberto antes de implementar

1. **Posição do menu**: sidebar vertical ou topbar horizontal?
2. **Rota de Configurações**: `/configuracoes` ou outra estrutura?
3. **Sub-rota de Gestão de Acessos**: `/configuracoes/usuarios` ou `/gestao-de-acessos`?
4. **Landing padrão após login**: Admin/Galapos aterrisam em `/dashboard` ou em uma home?
5. **Landing padrão para Parceiro**: aterrissar em `/portal-assessor` ou direto em `/portal-assessor/pipeline`?

Essas decisões devem ser registradas antes da implementação do Bloco 5.

## Ordem sugerida de implementação

1. Tomar as decisões em aberto acima.
2. Atualizar `portal-shell.tsx` para receber camada do usuário como prop.
3. Criar componente `MainNav` com itens condicionais por camada.
4. Integrar `MainNav` ao layout raiz da aplicação.
5. Adicionar proteção server-side de `/dashboard` para Parceiro.
6. Adicionar proteção server-side de `/configuracoes` para Parceiro.
7. Testar manualmente com usuário Admin, Galapos e Parceiro.
8. Rodar lint e build.
