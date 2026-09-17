# Operação de produção

- Segredos ficam nos ambientes Vercel/EAS/Supabase. Aplicativos clientes usam apenas a chave pública. Rotacionar segredo exposto e revisar logs; nunca incluir tokens, mensagens, casos, anexos ou e-mails completos em logs de erro.
- Erros devem ter identificador de operação, horário e resultado; Sentry deve receber somente dados técnicos com remoção de dados pessoais. DSN/configuração do projeto precisa ser fornecido pelo titular; ausência de DSN não deve bloquear o app.
- Monitorar `/api/health` externamente. Falha de cron/e-mail ou banco exige checks próprios; health do processo não cobre essas dependências.
- Auditoria administrativa deve registrar ator, ação, alvo e horário no banco. Consultar somente com papel autorizado; não registrar texto clínico no evento.
- Rate limit deve atuar no servidor nas ações de cadastro, convite e envio; limite em memória não protege múltiplas instâncias. Verificar respostas 429 e não repetir automaticamente operações que possam duplicar conteúdo.
- Confirmar backups/PITR disponíveis no plano Supabase contratado. Storage exige estratégia própria; backup do banco não garante recuperação dos objetos. Fazer teste de restauração em projeto isolado e registrar data, duração e resultado antes da operação contínua.
- Rollout: aplicar migrations aditivas em staging, executar RLS/smoke, promover backend compatível antes dos clientes. Registrar versões das migrations e binários. Se falhar, reverter cliente/deploy e preservar dados; não desfazer migration destrutiva sem plano de restauração.
- Atendimento: atribuir responsável pelos canais de suporte e privacidade, revisão de denúncias e solicitação de exclusão. Políticas de retenção/prazos dependem de aprovação jurídica.

Não considerar estes itens concluídos por existir documentação: registrar evidência de configuração, restore e teste de autorização no checklist de release.
