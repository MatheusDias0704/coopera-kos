# Coopera Kós

PWA privada para a comunidade educacional de blefaroplastia Kós. Esta versão é um beta: use apenas conteúdo fictício e nunca informações de pacientes.

## Executar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sem elas, o app mostra uma tela de configuração e não expõe dados demonstrativos.

## Supabase

1. Crie um projeto Supabase e execute [`supabase/schema.sql`](./supabase/schema.sql) no SQL Editor.
2. Em **Authentication > URL Configuration**, cadastre o endereço local e a URL Vercel como Redirect URLs.
3. Em **Authentication > Users**, envie um convite para `matheusheyn@gmail.com` com redirecionamento para `/?set-password=1`.
4. Execute [`supabase/bootstrap-beta.sql`](./supabase/bootstrap-beta.sql) depois que o usuário existir. Isso cria a turma beta e atribui o papel de administrador.

O schema cria o bucket privado `case-media`, limita upload a 50 MB e aplica políticas de acesso por turma e papel. Nunca torne esse bucket público.

## Verificação e deploy

```bash
npm run typecheck
npm run build
npx impeccable detect app --verbose
```

O GitHub Actions executa a verificação a cada push. Configure na Vercel somente as variáveis presentes em `.env.example`; `SUPABASE_SERVICE_ROLE_KEY` nunca é usado no navegador e não deve ser commitido.
