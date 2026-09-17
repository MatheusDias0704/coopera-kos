# Coopera Kós

PWA privada para a comunidade educacional de blefaroplastia Kós. Esta versão é um beta: use apenas conteúdo fictício e nunca informações de pacientes.

## Executar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sem elas, o app mostra uma tela de configuração e não libera a comunidade. O botão Google só aparece quando `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` e o OAuth já estiver configurado no Supabase.

## Supabase

1. Crie um projeto Supabase e execute [`supabase/schema.sql`](./supabase/schema.sql), depois [`supabase/migrations/20260913_production_hardening.sql`](./supabase/migrations/20260913_production_hardening.sql), no SQL Editor.
2. Em **Authentication > URL Configuration**, cadastre o endereço local e a URL Vercel como Redirect URLs.
3. Execute [`supabase/bootstrap-beta.sql`](./supabase/bootstrap-beta.sql) depois que `matheusheyn@gmail.com` existir. Isso cria a turma beta e atribui o papel de administrador.
4. Antes de abrir o link para um grupo, execute [`supabase/prepare-open-beta.sql`](./supabase/prepare-open-beta.sql). Isso remove casos, mensagens, anexos e notificações antigas da turma beta sem apagar participantes.

O schema cria o bucket privado `case-media`, limita upload a 50 MB e aplica políticas de acesso por turma e papel. Nunca torne esse bucket público. A migração adiciona conversas 1:1 transacionais, documentos legais versionados, aceite, auditoria e fila de e-mail.

## Verificação e deploy

```bash
npm run typecheck
npm run build
npx impeccable detect app --verbose
```

O GitHub Actions executa a verificação a cada push. Configure na Vercel somente as variáveis presentes em `.env.example`; `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `CRON_SECRET` nunca devem ser commitidos. Configure `app.institutokos.com.br` na Vercel, crie o CNAME/A record indicado no DNS Hostinger e autorize o mesmo domínio no Resend (SPF/DKIM).

## Operação

O cadastro por e-mail/senha fica aberto para o beta e provisiona novos participantes como alunos da turma beta. O painel Administração permite convidar participantes, atribuir papéis e desativar acessos. O endpoint de cron processa a caixa de saída de e-mails; configure `CRON_SECRET` também na Vercel para o cron. No plano Hobby da Vercel o cron é diário; envio imediato requer um plano compatível ou worker externo. Os documentos provisórios estão no banco em `legal_documents` e devem ser substituídos pelos textos jurídicos finais antes da operação clínica contínua.
