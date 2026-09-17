# Arquitetura do Coopera Kós

O produto tem dois clientes, web Next.js e mobile Expo, e um banco Supabase compartilhado. A UI chama a Interface `createCoopera` de `@coopera/data-supabase`. Nenhuma tela precisa conhecer tabelas, joins, caminhos de Storage ou detalhes de autenticação Supabase.

## Módulos e Interfaces

`@coopera/domain` concentra regras puras e tipos de negócio. `IdentityAccess` valida credenciais; `CohortAccess.can` decide visibilidade de ações; `ClinicalCases.prepare` concentra limites, formatos e aceite de anonimização; `Discussion` valida contribuições, sínteses e denúncias; `PrivateMedia.validate` valida anexos; `Messaging` valida mensagens; `AdminOperations` protege alterações de acesso; `LegalConsent` compara versões vigentes.

`@coopera/data-supabase` é o Adapter para a dependência remota. A Interface `createCoopera(client, options)` recebe um cliente autenticado da plataforma e retorna módulos `identity`, `cohorts`, `cases`, `discussion`, `media`, `messaging`, `notifications`, `admin` e `legal`. Operações retornam dados, ou lançam um erro; nunca ocultam falhas como listas vazias. As opções `serverUrl`, `fetch` e `randomId` permitem o transporte HTTP e o gerador de identidade apropriados a web/mobile e aos testes. Os tipos de domínio não dependem de React, Next ou Expo.

Essa seam concentra consultas, joins, sessão, validação, URLs temporárias, registro/compensação de uploads e transporte administrativo. A Implementation de upload remove o objeto recém-enviado se o registro falha e sinaliza explicitamente uma eventual falha de limpeza. URLs de mídia expiram em 60 segundos. O feed retorna os 100 casos mais recentes e as mensagens retornam as últimas 100, em ordem cronológica; paginação deve preceder a ampliação desses limites.

## Autorização

O `CohortAccess` é uma conveniência para a experiência, não uma autorização confiável. Postgres RLS é obrigatório para cada requisição, inclusive requisições diretas que não passam pelos clientes. A chave de servidor nunca entra no aplicativo nem nas variáveis públicas. Rotas administrativas validam JWT e participação ativa de admin na turma antes de usar credenciais privilegiadas.

Migrações preservam o schema existente. `20260917_store_security.sql` corrige a recursão da lista de participantes de conversa usando uma função restrita por `auth.uid()`, exige participação ativa para mensagens, impede reatribuição de conteúdo entre turmas, restringe upload ao autor/caso e isola auditoria por turma. O procedimento `open_direct_conversation_in_cohort` serializa a criação para o mesmo par/turma. O procedimento antigo permanece compatível com clientes web já publicados.

Os limites de escrita persistem no banco por usuário e minuto: 5 casos, 20 comentários, 30 mensagens e 5 denúncias. Inserções administrativas sem usuário autenticado são reservadas ao servidor. A saída de e-mail contém somente um aviso genérico, sem texto clínico ou mensagem privada. Dados históricos de auditoria sem turma permanecem acessíveis apenas pelo servidor.

`20260917_user_safety.sql` permite bloquear/desbloquear colegas. O bloqueio interrompe leitura e envio das conversas para ambos os lados e oculta o conteúdo do bloqueado para quem bloqueou; administração retém visibilidade de moderação. A própria lista de bloqueios é privada. `identity.requestAccountDeletion` registra uma solicitação idempotente pendente; não executa apagamento imediato. A equipe operacional precisa processar a fila no servidor, incluindo conta Auth, objetos Storage e retenção/anônimização de conteúdo compartilhado conforme política aprovada, antes de habilitar lançamento público.

## Verificação e implantação

Rode testes de regras pela Interface de domínio: `node --experimental-strip-types --test packages/domain/tests/*.test.ts`. O teste `supabase/tests/rls.sql` executa usuários autenticados reais sob RLS PostgreSQL, com fixtures dentro de uma transação revertida.

Banco novo: aplique `supabase/schema.sql`, depois as migrações em ordem lexicográfica. Banco existente: aplique apenas migrações ainda não aplicadas, após backup verificado. Nunca execute `bootstrap-beta.sql` ou `prepare-open-beta.sql` em produção; são procedimentos legados de protótipo. `supabase/tests/bootstrap-local.sql` é exclusivo de banco de teste local vazio e fornece o mínimo de `auth` e `storage` para testar SQL sem Docker. Ele não simula o servidor HTTP de Storage nem prova entrega de e-mail ou assinatura de URL.

A validação local de RLS não substitui smoke de staging Supabase, armazenamento privado, autenticação em dispositivo e fluxos Apple/Google. As migrações devem preceder os clientes que chamam o novo procedimento de mensagens. A configuração externa, o backup/restore real, consentimento jurídico e builds assinados são gates de release, e precisam de evidência antes de publicação.
