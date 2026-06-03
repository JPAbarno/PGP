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
- `specs/features/access-management.md`
- `specs/features/access-layers.md`
- `specs/features/partner-portal-unification.md`

## Decisões

- `specs/decisions/ADR-001-internal-access-only.md`
- `specs/decisions/ADR-002-authjs-google-oauth.md`
- `specs/decisions/ADR-003-authjs-microsoft-entra-id.md`
- `specs/decisions/ADR-004-access-layer-model.md`
- `specs/decisions/ADR-005-partner-portal-unification.md`

## Ordem recomendada de implementação

A ordem recomendada para as próximas mudanças é:

1. Remover a aba/rota `Scorecard`, seguindo `specs/features/remove-scorecard.md`.
2. Implementar gestão de acessos internos, seguindo `specs/features/access-management.md`.
3. Manter a proteção atual de páginas e APIs já feita na feature `access-management`.
4. Definir tecnologia de persistência para Gestão de Acessos.
5. Implementar modelo persistente de usuários, camadas, status e associação usuário-parceiro.
6. Implementar camadas de acesso.
7. Implementar escopo por parceiro no backend.
8. Unificar o Portal do Assessor na rota `/portal-assessor`.

Observação:

- As features `access-layers` e `partner-portal-unification` dependem de decisão futura sobre persistência.

## Prompt base para futuras tarefas com IA

Ao iniciar uma nova tarefa com IA, use este padrão:

> Leia primeiro os arquivos em `specs/`.
> Siga a spec da feature atual.
> Não implemente nada fora da spec.
> Antes de alterar código, liste os arquivos que pretende modificar e explique o motivo.
