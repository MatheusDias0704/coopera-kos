# Release — Coopera Kós

Estado: preparação técnica. Um build local/export não equivale a binário assinado, teste em dispositivo, publicação ou aprovação das lojas.

## Configuração e credenciais

- Nome público: Coopera Kós. Identificador iOS/Android: `br.com.institutokos.cooperakos`.
- O titular configura Expo/EAS, Apple Developer/App Store Connect e Google Play Console. Certificados, cobrança e aceites das plataformas exigem o titular.
- Configure as variáveis públicas Supabase no ambiente EAS de produção. Nunca coloque `SUPABASE_SERVICE_ROLE_KEY`, Resend, credenciais de assinatura ou senhas de revisão no app/commit.
- Conecte o app ao projeto EAS do titular (`npx eas-cli init`) e confirme o identificador definitivo antes do primeiro upload. Não invente `projectId`, team ID ou conta de serviço.
- Backend de produção deve ficar ativo durante revisão. Configure os redirect URLs/deep links de recuperação de senha antes de testar.

## Verificação antes de gerar binários

Na raiz do repositório:

```sh
npm ci
npm run typecheck
npm test
npm run build
cd apps/mobile
npx expo-doctor
npx eas-cli whoami
npx eas-cli init
npx eas-cli build --platform all --profile production
```

EAS cloud gera o `.ipa`/`.aab` assinado. A execução pode exigir login, associação ao projeto, certificados e conta paga; registre a URL do build e seu número de versão. Use [EAS Build](https://docs.expo.dev/deploy/build-project/) e [configuração dos perfis](https://docs.expo.dev/build-reference/build-configuration/).

## Revisão e distribuição

1. Crie usuários de revisão médico e admin em uma turma exclusiva com conteúdo fictício, sem dados de pacientes. Ambos devem ter convite/membership ativo. Entregue senha via App Store Connect/Play Console; não via repositório. Preserve o login durante toda a revisão.
2. Faça o roteiro em `SMOKE.md` em iPhone e Android reais. Guarde resultados, versões dos dispositivos e screenshots reais; capturas de conceito não substituem screenshots da versão submetida.
3. Envie iOS: `npx eas-cli submit --platform ios --profile production --latest`. Teste o build processado em TestFlight e complete a ficha App Store antes de solicitar revisão.
4. Envie Android: `npx eas-cli submit --platform android --profile production --latest`. Faça o primeiro upload manual se exigido pela Play Console e configure a conta de serviço fora do repositório. Valide primeiro na faixa Internal Testing.
5. Configure ficha, privacidade, faixa etária, países e declarações. O titular aprova as respostas legais e publica após a revisão das plataformas.

[EAS Submit](https://docs.expo.dev/distribution/introduction/) faz upload do binário; não preenche toda a ficha nem concede aprovação. Para novos apps/atualizações Android em setembro de 2026, confirme API 36 ou superior no AAB: [requisito oficial](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en).

## Metadata e assets

Textos PT-BR, notas de revisão, campos pendentes e roteiro de capturas estão em [STORE.md](STORE.md). A ficha anuncia somente as funcionalidades disponíveis no mobile.

## Gates de release

O responsável jurídico aprova textos, bases de tratamento, retenção e direitos LGPD. O responsável operacional confirma que os endereços de suporte/privacidade recebem mensagens e têm responsável. Antes da submissão, a experiência deve conter denúncia/moderação, bloqueio de usuários abusivos e início de exclusão de conta, quando há criação de conta. Não substitua exclusão por mera desativação de membership.

Fontes: [Apple App Review](https://developer.apple.com/app-store/review/guidelines/) e [exclusão de conta Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app). Revalide requisitos no dia da submissão.
