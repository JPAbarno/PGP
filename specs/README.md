# Specs da PGP

Este diretório contém a documentação de Spec-Driven Development da PGP — Plataforma de Gestão de Parcerias da Galapos.

As specs servem como fonte de verdade para decisões de produto, regras de negócio, escopo funcional e diretrizes de implementação.

## Objetivo

Reduzir dependência de contexto longo em conversas com IA e consolidar o conhecimento do projeto em arquivos pequenos, revisáveis e versionados no repositório.

A conversa serve para descobrir.

A spec serve para lembrar.

O código serve para executar.

## Como usar estas specs

Antes de implementar qualquer nova funcionalidade ou alteração relevante, leia:

1. `specs/product/product-context.md`
2. `specs/architecture/current-state.md`
3. a ADR relacionada à decisão da mudança
4. a spec da feature em desenvolvimento

## Regras gerais

- Não implementar funcionalidades fora das specs.
- Não assumir acesso para parceiros externos.
- Não recriar a aba ou rota `Scorecard`, salvo se uma nova spec futura aprovar isso.
- Toda decisão relevante de produto ou arquitetura deve ser documentada.
- Mudanças devem ser pequenas, rastreáveis e compatíveis com o estado atual do projeto.
- Antes de alterar código, listar quais arquivos serão modificados e por quê.

## Produto

- `specs/product/product-context.md`

## Arquitetura

- `specs/architecture/current-state.md`

## Domínio

- `specs/domain/users-roles-and-partner-access.md`

## Features

- `specs/features/remove-scorecard.md`
- `specs/features/access-management.md` — Gestão de Acessos Internos. Fase 1 implementada. Gestão de Acessos com UI Admin pendente (bloqueante para produção).
- `specs/features/access-layers.md` — Camadas de Acesso. Controle de acesso por camada implementado no Bloco 4. Navegação condicional e Gestão de Acessos UI pendentes.
- `specs/features/partner-portal-unification.md` — Unificação do Portal do Assessor. MVP Parcial Implementado no Bloco 4. Navegação unificada e Gestão de Acessos UI pendentes.
- `specs/features/navigation-unification.md` — Navegação Unificada da PGP. Pendente — Bloco 5.

## Decisões

- `specs/decisions/ADR-001-internal-access-only.md`
- `specs/decisions/ADR-002-authjs-google-oauth.md`
- `specs/decisions/ADR-003-authjs-microsoft-entra-id.md`
- `specs/decisions/ADR-004-access-layer-model.md`
- `specs/decisions/ADR-005-partner-portal-unification.md`
- `specs/decisions/ADR-006-dataverse-access-persistence.md`
- `specs/decisions/ADR-007-external-partner-authentication.md`
- `specs/decisions/ADR-008-pgp-unification-approach.md` — Abordagem de unificação: recriação dentro da PGP vs. migração do Portal XP. Registrada na Fase 5.1.

## Estado atual do produto (2026-06-30)

### Implementado

- Autenticação com Auth.js/NextAuth e Microsoft Entra ID (ADR-003).
- Autorização via Dataverse (ADR-006, ADR-007).
- Gestão do Canal em `/dashboard` (Admin e Galapos).
- Portal do Assessor em `/portal-assessor` com pipeline, clientes, comissões e formulário (Bloco 4).
- Controle de acesso por camada (Admin, Galapos, Parceiro) nas APIs e páginas do Portal do Assessor (Bloco 4).
- Escopo por parceiro no backend (Bloco 4).

### Pendente — bloqueante para produção

- Navegação unificada: menu principal por camada. Spec: `navigation-unification.md`.
- Gestão de Acessos com UI Admin: tela CRUD de usuários dentro da PGP.

### Pendente — bloqueante para homologação com parceiros reais

- Configuração operacional do Entra ID: Conditional Access, Guest B2B ou multi-tenant (ADR-007).
- Navegação unificada (experiência mínima para homologação).

### Decisões em aberto antes de implementar o Bloco 5

1. Como será a navegação principal unificada? (sidebar ou topbar; rota de Configurações)
2. Qual a rota e estrutura da Gestão de Acessos dentro da PGP?
3. A escrita no Dataverse será via API direta ou via Power Automate?
4. A estratégia de autenticação para parceiros externos será Guest B2B, multi-tenant ou provider adicional?

## Ordem recomendada de implementação

### Já implementado (histórico)

1. ✅ Remover a aba/rota `Scorecard`.
2. ✅ Implementar gestão de acessos internos (domínio Galapos).
3. ✅ Migrar provider de autenticação para Microsoft Entra ID.
4. ✅ Implementar Dataverse como persistência de autorização (somente leitura).
5. ✅ Implementar camadas de acesso (Admin, Galapos, Parceiro) nas APIs e páginas.
6. ✅ Implementar escopo por parceiro no backend.
7. ✅ Implementar Portal do Assessor na rota `/portal-assessor` (MVP Parcial — Bloco 4).

### Próximos passos (Bloco 5)

8. Tomar as decisões em aberto do Bloco 5 (navegação, Gestão de Acessos, escrita no Dataverse).
9. Implementar navegação unificada por camada (`navigation-unification.md`).
10. Implementar Gestão de Acessos com UI Admin dentro da PGP.

### Pós-Bloco 5

11. Resolver configuração operacional de Entra ID para parceiros externos (ADR-007).
12. Homologação com parceiros reais.
13. Melhorias de UX no Portal do Assessor (Kanban, filtros, gráficos).
14. Auditoria de acessos.
15. Hardening e produção.

## Prompt base para futuras tarefas com IA

Ao iniciar uma nova tarefa com IA, use este padrão:

> Leia primeiro os arquivos em `specs/`.
> Siga a spec da feature atual.
> Não implemente nada fora da spec.
> Antes de alterar código, liste os arquivos que pretende modificar e explique o motivo.
