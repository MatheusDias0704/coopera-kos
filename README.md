# Coopera Kós

PWA privada para a comunidade educacional de blefaroplastia Kós. Esta versão é um beta: use apenas conteúdo fictício e nunca informações de pacientes.

## Executar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sem elas, o app mostra uma tela de configuração e não libera a comunidade.

## Supabase

1. Crie um projeto Supabase e execute [`supabase/schema.sql`](./supabase/schema.sql), depois [`supabase/migrations/20260913_production_hardening.sql`](./supabase/migrations/20260913_production_hardening.sql), no SQL Editor.
2. Em **Authentication > URL Configuration**, cadastre o endereço local e a URL Vercel como Redirect URLs.
3. Em **Authentication > Users**, envie um convite para `matheusheyn@gmail.com` com redirecionamento para `https://app.institutokos.com.br/?set-password=1`.
4. Execute [`supabase/bootstrap-beta.sql`](./supabase/bootstrap-beta.sql) depois que o usuário existir. Isso cria a turma beta e atribui o papel de administrador.

O schema cria o bucket privado `case-media`, limita upload a 50 MB e aplica políticas de acesso por turma e papel. Nunca torne esse bucket público. A migração adiciona conversas 1:1 transacionais, documentos legais versionados, aceite, auditoria e fila de e-mail.

## Verificação e deploy

```bash
npm run typecheck
npm run build
npx impeccable detect app --verbose
```

O GitHub Actions executa a verificação a cada push. Configure na Vercel somente as variáveis presentes em `.env.example`; `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` e `CRON_SECRET` nunca devem ser commitidos. Configure `app.institutokos.com.br` na Vercel, crie o CNAME/A record indicado no DNS Hostinger e autorize o mesmo domínio no Resend (SPF/DKIM).

## Operação

O painel Administração permite convidar participantes, atribuir papéis e desativar acessos. O endpoint de cron processa a caixa de saída de e-mails; configure `CRON_SECRET` também na Vercel para o cron. Os documentos provisórios estão no banco em `legal_documents` e devem ser substituídos pelos textos jurídicos finais antes da operação clínica contínua.
