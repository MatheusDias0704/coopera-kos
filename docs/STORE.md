# Ficha das lojas — PT-BR

Textos prontos para copiar, alinhados às telas mobile atuais. Finalizar os campos operacionais abaixo antes de enviar. Instruções de build e envio: [RELEASE.md](RELEASE.md).

## App Store

Nome: Coopera Kós

Subtítulo: Casos clínicos em comunidade

Texto promocional: Compartilhe casos anonimizados e acompanhe o aprendizado da sua turma em um ambiente educacional com acesso por convite.

Palavras-chave: educação,casos,clínica,aprendizado,turma,Kós

Categoria proposta: Educação. Preencher classificação etária pelo questionário da loja.

## Google Play

Nome: Coopera Kós

Descrição curta: Casos clínicos anonimizados para o aprendizado da comunidade Kós.

Categoria proposta: Educação. Preencher classificação de conteúdo pelo questionário da loja.

## Descrição completa — ambas as lojas

Coopera Kós é o ambiente educacional da comunidade Kós para participantes convidados de turmas ativas.

Acesse os casos compartilhados pela sua turma, leia o contexto clínico e a pergunta proposta, e publique novos casos com informações anonimizadas. Você também pode anexar imagens para uso educacional, acompanhar atualizações e consultar seu perfil de participação.

O acesso exige uma conta previamente convidada. A publicação exige confirmação de anonimização e da base legal para o uso educacional do conteúdo. Não inclua nomes, documentos, imagens identificáveis ou outros dados que permitam identificar pacientes.

O app tem finalidade educacional. Não oferece diagnóstico, atendimento médico ou orientação individual ao paciente e não substitui avaliação médica nem o julgamento do profissional responsável.

## Notas para revisão — preencher nos consoles

Coopera Kós é uma comunidade educacional fechada por convite. A conta de revisão tem participação ativa em uma turma de demonstração com conteúdo fictício e não requer que o revisor solicite convite. O backend permanecerá disponível durante a revisão.

Preencher somente no campo protegido do console: e-mail e senha da conta de revisão, nome da turma e contato de suporte que recebe mensagens. Não registrar senhas neste arquivo.

Roteiro:

1. Na tela inicial, selecione “Entrar”, informe as credenciais fornecidas e toque em “Entrar na comunidade”.
2. Na aba de casos, abra um caso de demonstração para ler contexto e pergunta.
3. Abra “Publicar caso”, preencha título, contexto e pergunta com conteúdo fictício, confirme a anonimização e publique. O acesso às fotos é usado somente se o revisor escolher anexar uma imagem.
4. Abra “Perfil” para consultar a participação. “Solicitar exclusão de conta” inicia uma solicitação que deve ser atendida pela equipe; use uma segunda conta descartável ao testar esse fluxo.
5. “Sair da conta” encerra o acesso.

Adicionar ao roteiro os caminhos reais para denúncia, bloqueio, termos e suporte após sua implementação e validação. A versão mobile atual não oferece conversa 1:1, escrita de comentários ou denúncia pela tela de caso; não anunciar essas funcionalidades na ficha nem usar a ficha para ocultar essa pendência de produto.

## Campos operacionais ainda necessários

- URL HTTPS de suporte, política de privacidade e termos, acessíveis sem login.
- URL HTTPS de solicitação de exclusão para Google Play, acessível sem instalar o app.
- Nome/contato do desenvolvedor, direitos autorais, países e preço definidos pelo titular.
- Conta de revisão ativa e contato de atendimento validado.
- App Privacy e Data Safety preenchidos a partir da coleta real de conta, conteúdo, anexos e fornecedores; não assumir ausência de coleta.

## Capturas e arte de loja

Capturar o binário submetido em simulador ou aparelho com a turma fictícia; conceito ou mockup não comprova a interface real. Usar a mesma ordem nas duas lojas:

| Arquivo sugerido | Tela | Mensagem opcional |
|---|---|---|
| 01-casos.png | Feed preenchido | Aprenda com os casos da turma |
| 02-caso.png | Caso de demonstração | Contexto para raciocinar em conjunto |
| 03-publicar.png | Formulário de publicação | Compartilhe conteúdo anonimizado |
| 04-perfil.png | Perfil da conta fictícia | Uma comunidade por convite |

Não mostrar dados reais, e-mails, credenciais, pacientes ou funcionalidades futuras. Revisar legibilidade e recortes em cada aparelho. O app não declara suporte universal a iPad nesta fase, para reduzir escopo de QA e capturas.

- Apple: usar uma resolução aceita para o dispositivo, segundo as [especificações oficiais de screenshots](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).
- Google Play: preparar ícone de loja 512×512 e feature graphic 1024×500, além de screenshots reais Android, conforme os [requisitos oficiais de assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en-GB).

Assets base já gerados:

- `apps/mobile/assets/icon.png`: 1024×1024, usado pelo Expo.
- `store-assets/google-play/icon-512.png`: ícone Google Play.
- `store-assets/google-play/feature-graphic-1024x500.png`: arte base Google Play.
- `store-assets/screenshots-base/*.png`: bases visuais para planejamento, não substituem capturas reais do binário final.

Regenerar com `npm run store:assets` se mudar identidade visual.

Captura sem ferramenta adicional: no Simulator aberto, `xcrun simctl io booted screenshot /tmp/coopera-casos-ios.png`; no aparelho/emulador Android autorizado, `adb shell screencap -p /sdcard/coopera-casos.png` seguido de `adb pull /sdcard/coopera-casos.png /tmp/coopera-casos-android.png`. Repetir após navegar às demais telas. Confira as dimensões com `sips -g pixelWidth -g pixelHeight /tmp/coopera-casos-ios.png`.
