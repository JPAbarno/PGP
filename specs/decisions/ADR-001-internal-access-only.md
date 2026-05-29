# ADR-001 — Plataforma restrita a usuários internos Galapos

## Status

Aceita.

## Contexto

A PGP é uma plataforma para análise de resultado e performance de parcerias da Galapos.

Embora o tema do produto envolva parcerias, a plataforma não será disponibilizada para parceiros externos nesta fase.

O uso inicial será exclusivamente interno, por pessoas da Galapos.

## Decisão

A PGP será tratada como uma plataforma interna da Galapos.

O acesso deve ser restrito a usuários autenticados com e-mail corporativo no domínio:

- `@galapos.com.br`

Não será implementado, nesta fase:

- portal externo para parceiros;
- login de parceiros;
- permissões por parceiro;
- multi-tenant;
- área pública da plataforma.

## Consequências

### Consequências positivas

- Reduz complexidade inicial de autenticação e autorização.
- Evita necessidade de modelo multi-tenant.
- Permite foco no valor interno da análise de performance.
- Reduz risco de exposição indevida de dados.
- Facilita prototipação controlada.

### Consequências negativas ou limitações

- Parceiros não poderão acessar diretamente a plataforma.
- Compartilhamento externo dependerá de exportações, apresentações ou outras ferramentas.
- Caso a Galapos decida abrir a plataforma futuramente, será necessário redesenhar parte do modelo de acesso.

## Alternativas consideradas

### Abrir acesso para parceiros desde o início

Rejeitada nesta fase por aumentar complexidade de:

- autenticação;
- autorização;
- segregação de dados;
- governança;
- experiência de usuário externo;
- segurança.

### Criar múltiplos perfis de usuário agora

Adiada.

Pode fazer sentido no futuro, mas o escopo atual exige apenas garantir que usuários internos da Galapos tenham acesso.

## Decisões futuras relacionadas

Deverão ser documentadas em ADRs próprias:

- escolha da ferramenta de autenticação;
- eventual criação de perfis internos;
- eventual liberação para parceiros;
- política de proteção de APIs;
- modelo de auditoria de acesso.
