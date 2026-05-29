# PGP — Contexto do Produto

## Visão geral

A PGP — Plataforma de Gestão de Parcerias da Galapos — é uma plataforma interna para análise de resultado e performance de parcerias.

O objetivo do produto é apoiar a Galapos na leitura e acompanhamento de dados relacionados às suas parcerias, permitindo visualizar indicadores, métricas, rankings, análises e informações consolidadas de performance.

Nesta fase, a PGP deve ser tratada como uma ferramenta interna da Galapos, e não como um portal externo para parceiros.

## Problema que a plataforma resolve

A Galapos possui parcerias que precisam ser acompanhadas, analisadas e avaliadas de forma estruturada.

A plataforma busca centralizar informações de performance dessas parcerias para facilitar a análise interna, apoiar decisões comerciais e estratégicas, acompanhar resultados e identificar oportunidades de melhoria.

## Usuários

Nesta fase, os usuários da plataforma são exclusivamente pessoas internas da Galapos.

O acesso deve ser restrito a usuários com e-mail corporativo no domínio `@galapos.com.br`.

Não há, neste momento, previsão de uso por parceiros externos.

## Escopo atual

O escopo atual da PGP contempla uma plataforma interna para análise de parcerias, com foco em visualização de dados, métricas de performance e acompanhamento de resultados.

Nesta fase, o produto deve priorizar:

* uso interno por pessoas da Galapos;
* dashboard principal de análise de parcerias;
* visualização de métricas consolidadas;
* análise de performance;
* rankings e comparativos;
* leitura de dados históricos ou consolidados;
* clareza de navegação;
* restrição de acesso a usuários Galapos.

## Fora do escopo atual

Não faz parte do escopo atual:

* acesso para parceiros externos;
* portal de parceiros;
* login de clientes;
* usuários de empresas parceiras;
* permissões específicas por parceiro;
* múltiplos tenants;
* área pública da plataforma;
* disponibilização externa dos dashboards;
* gestão avançada de usuários;
* perfis complexos de autorização;
* recriação ou manutenção da aba `Scorecard` como página separada.

## Decisões de produto já tomadas

As seguintes decisões de produto estão definidas para a fase atual:

1. A PGP será uma plataforma interna da Galapos.
2. O acesso será restrito a usuários com e-mail `@galapos.com.br`.
3. Parceiros externos não terão acesso à plataforma nesta fase.
4. A aba/página `Scorecard` deve ser removida do escopo atual.
5. O foco inicial será o dashboard principal de análise de parcerias.
6. A documentação em `/specs` será usada como fonte de verdade para orientar desenvolvimento futuro.

## Pontos ainda em aberto

Os seguintes pontos ainda precisam ser definidos em specs futuras, se necessário:

* se haverá diferentes perfis internos de usuários;
* se haverá permissões por área ou função;
* se haverá auditoria de acessos;
* se haverá exportação de dados;
* se a plataforma será aberta para parceiros em uma fase futura;
* se haverá um modelo de governança para atualização das métricas;
* quais indicadores serão considerados oficiais para avaliação de performance das parcerias.

## Princípio orientador

A conversa serve para descobrir.

A spec serve para lembrar.

O código serve para executar.

Por isso, decisões relevantes de produto devem ser registradas neste diretório antes de virarem implementação.
