# ADR-008 — Abordagem de Unificação: Recriação dentro da PGP vs. Migração do Portal XP

## Status

Aceita — registrada na Fase 5.1 como resultado da Auditoria de Rota (Fase 5.0).

## Contexto

A ADR-005 decidiu incorporar o `PortalAssessor` como módulo dentro da PGP. A spec `partner-portal-unification.md` foi escrita com a linguagem de "migrar" funcionalidades do projeto `PortalAssessor` para a PGP.

Com base nessa decisão, o Bloco 4 foi executado com o objetivo de entregar o Portal do Assessor dentro da PGP.

Após a conclusão do Bloco 4, a Fase 5.0 realizou uma auditoria de rota para verificar se o desenvolvimento estava alinhado ao objetivo original de fusão/unificação entre Analise Parceiros (PGP) e Portal XP (PortalAssessor).

### Achados da Fase 5.0

1. O código do projeto `PortalAssessor` ou `Portal XP` **não está disponível no repositório da PGP**.
2. Não houve migração, cópia ou importação de código de repositório externo.
3. Nenhuma referência a "Portal XP", "PortalXP" ou repositório externo foi encontrada no codebase.
4. As funcionalidades do Portal do Assessor foram **implementadas do zero** dentro da arquitetura PGP durante o Bloco 4.
5. O código foi criado incrementalmente dentro do repositório (commits sequenciais de "Add advisor portal ...").
6. O resultado é funcionalmente equivalente ao que estava especificado.

### Por que não houve migração de código

- O código do `PortalAssessor` não estava disponível no repositório durante a implementação do Bloco 4.
- A arquitetura do PGP (snapshot materializado, Dataverse como autorização, Auth.js com Entra ID) é suficientemente diferente do `PortalAssessor` que uma migração direta teria exigido refatoração significativa de qualquer forma.
- Recriar dentro da arquitetura PGP foi mais eficiente do que migrar e adaptar código de outra base.

### Diferença entre "fusão de código" e "fusão funcional"

Esta ADR distingue dois conceitos:

- **Fusão de código**: migrar código-fonte de um repositório para outro, reaproveitando componentes, lógicas e estruturas existentes.
- **Fusão funcional**: implementar as mesmas funcionalidades dentro de uma arquitetura unificada, sem necessariamente reutilizar o código-fonte do projeto original.

O Bloco 4 entregou **fusão funcional**, não fusão de código.

## Decisão

Aceitar que o Portal do Assessor foi **recriado do zero** dentro da arquitetura PGP como abordagem adotada neste ciclo de desenvolvimento.

Esta decisão implica:

1. **Não há plano ativo de migração de código do Portal XP para a PGP.** Se o código do Portal XP for acessado no futuro, qualquer aproveitamento deve ser avaliado caso a caso, como melhoria incremental — não como uma migração pendente.

2. **O objetivo original de "fusão/unificação" entre Analise Parceiros e Portal XP foi alcançado funcionalmente.** A PGP agora concentra as funcionalidades de ambas as ferramentas, ainda que o código do Portal XP não tenha sido migrado diretamente.

3. **A linguagem das specs futuras deve usar "implementar" em vez de "migrar".** Referências a "migração de código do PortalAssessor" em specs existentes devem ser lidas como referências funcionais, não como migrações de código pendentes.

4. **Comparação com o Portal XP real requer acesso ao repositório externo.** Caso seja necessário comparar funcionalidades, UX ou regras de negócio com o Portal XP original, isso requer acesso explícito ao código ou specs do projeto `PortalAssessor`.

5. **A unificação técnica de autenticação/autorização/dados está encaminhada.** Auth.js, Dataverse e snapshot são compartilhados entre Gestão do Canal e Portal do Assessor.

6. **A unificação de experiência de produto ainda está pendente.** Navegação unificada e Gestão de Acessos com UI Admin são os próximos passos para que o produto seja percebido como unificado.

## Impactos para o roadmap

### O que já está entregue (resultado da "fusão funcional")

- Portal do Assessor operacional em `/portal-assessor` com pipeline, clientes, comissões e formulário.
- APIs protegidas com escopo por parceiro.
- Autenticação e autorização unificadas (Auth.js + Dataverse).
- Dados unificados (snapshot).

### O que ainda é necessário para a experiência de produto unificada

- **Bloco 5 — Navegação unificada**: menu principal mostrando Gestão do Canal e Portal do Assessor por camada. Spec: `navigation-unification.md`.
- **Bloco 5 — Gestão de Acessos com UI Admin**: tela CRUD de usuários dentro da PGP. Bloqueante para produção.

### O que não é pré-requisito para continuar

- Acesso ao código-fonte do `PortalAssessor` ou `Portal XP`. Não é necessário para os próximos blocos.
- Migração retroativa de código. A recriação é a abordagem adotada e não há trabalho pendente de migração.

## Consequências positivas

- Clareza sobre o que foi e o que não foi entregue no Bloco 4.
- Linguagem de specs alinhada com a realidade do repositório.
- Roadmap orientado por gaps reais (navegação, Gestão de Acessos), não por expectativas de migração.
- Sem dependência de acesso a repositório externo para continuar o desenvolvimento.

## Consequências negativas ou limitações

- Se o Portal XP original tiver regras de negócio, UX ou lógicas que não foram documentadas nas specs, essas diferenças só serão descobertas ao acessar o repositório ou ao comparar com usuários reais.
- A linguagem de "migração" em specs anteriores pode criar confusão; esta ADR serve como ponto de referência para desambiguar.

## Alternativas consideradas

### Aguardar acesso ao repositório do Portal XP antes de continuar

Rejeitada.

Bloquear o desenvolvimento enquanto não há acesso ao repositório externo aumentaria o risco de paralisia. A abordagem de recriar do zero dentro da PGP é funcionalmente equivalente para o objetivo do produto.

### Migração retroativa de código do Portal XP para a PGP

Adiada neste ciclo.

Sem evidência de que a migração retroativa traria ganho funcional frente ao que já foi implementado. Pode ser reavaliada caso a caso se o repositório do Portal XP for acessado no futuro.

### Manter os dois projetos separados

Rejeitada (conforme ADR-005).

Manter separados aumenta duplicidade de autenticação, autorização e integrações.

## Fora do escopo desta decisão

- Definição de qual será o repositório oficial de produção da PGP.
- Estratégia de deploy e CI/CD.
- Comparação funcional detalhada com o Portal XP original.
- Eventual aproveitamento de componentes específicos do Portal XP, se o código for acessado.

## Decisões futuras relacionadas

- Spec de Gestão de Acessos com UI Admin (necessária antes de homologação com parceiros reais).
- Spec de navegação unificada: `specs/features/navigation-unification.md` (criada na Fase 5.1).
- Eventual acesso ao repositório do Portal XP para comparação funcional.
