# Smoke de aceitação

Registrar: commit, build web, build iOS/Android, ambiente, dispositivos, resultado e evidência. Usar apenas turma e conteúdo fictícios de teste.

## Automático

Depois de iniciar o build web, `node scripts/smoke.mjs` verifica `/api/health`, `/`, `/termos`, `/privacidade`, `/suporte`, `/remocao` e `/exclusao`. Para o deploy Vercel atual: `SMOKE_BASE_URL=https://coopera-kos.vercel.app node scripts/smoke.mjs`. Ao configurar o domínio próprio, repetir com `SMOKE_BASE_URL=https://app.institutokos.com.br node scripts/smoke.mjs`. O domínio próprio depende da configuração DNS/Hostinger do titular. Health confirma que o processo responde; não confirma disponibilidade do banco, envio de e-mail ou autorização.

## Web e mobile, em ambiente configurado

- Conta não convidada não entra na comunidade; login convidado entra; logout remove o acesso.
- Recuperação de senha retorna ao app correto. Sessão expirada pede autenticação sem perder rascunho indevidamente.
- Feed vazio exibe orientação; feed com casos abre detalhes. Conteúdo de outra turma não aparece.
- Publicação exige anonimização/aceite; erros conservam texto. Anexo permitido envia, arquivo inválido/tamanho excedido é rejeitado, URL assinada expira e bucket permanece privado.
- Comentário, reação e denúncia persistem após reabrir. Participante não ganha poderes de moderação.
- Mensagem 1:1 aparece somente para os dois participantes autorizados; abrir a mesma conversa não cria duplicata.
- Admin modera denúncia/desativa usuário; auditoria registra ação; desativado perde acesso após refresh em ambos os apps.
- Alertas abrem o destino correto. Permissão push negada não impede uso (push permanece desativado nesta versão).
- Perfil permite suporte/privacidade e início de exclusão quando aplicável. Termos/política abrem sem login.
- Testar VoiceOver/TalkBack, fonte ampliada, teclado, safe areas, rede ausente e retorno da rede.

## Evidência para release

Guardar screenshots reais do feed, caso, conversa e perfil; vídeo curto de login/publicação/denúncia; teste TestFlight e Internal Testing. Uma falha de autorização, privacidade, exclusão ou upload bloqueia submissão até correção.
