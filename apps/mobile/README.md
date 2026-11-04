# AquaFlow Mobile — Android e iOS

> Base nativa inicial para desenvolvimento/testes internos. **Não está pronta
> para envio à App Store ou Play Store.** A interface atual apenas abre rotas
> existentes do portal no navegador seguro do dispositivo.

## Executar

Node 22.13+ e Android Studio/Xcode ou EAS Build.

```bash
cd apps/mobile
npm install
cp .env.example .env.local
# Configure EXPO_PUBLIC_AQUAFLOW_URL com a origem HTTPS do ERP.
npx expo install --fix
npm run typecheck
npm run start
```

A compilação EAS requer conta Expo, projeto EAS vinculado, credenciais de
assinatura e testes em dispositivos reais. O `eas.json` prepara perfis internos
e de produção, mas nenhuma publicação é automática.

## Próximos requisitos obrigatórios

- Autenticação nativa segura (OAuth Authorization Code + PKCE ou fluxo
  equivalente aprovado), com tokens de curta duração e revogação;
- Sessão ligada ao tenant validado **no servidor**, não pelo ID do cliente;
- APIs de comanda, agendamento e caixa com RBAC e verificação do direito de uso;
- Transações idempotentes e confirmação do servidor, sem pagamentos falsos;
- Navegação e funcionalidades nativas completas (não mero site empacotado);
- Ícones definitivos, screenshots, privacidade/LGPD, conta de demonstração
  para revisão, política de exclusão de conta, testes e submissões.

O aplicativo não guarda senhas, credenciais Neon, chaves Stripe, tokens
de Mercado Pago nem identificadores de banco de dados no aparelho.

Referências:
- https://docs.expo.dev/build/
- https://developer.apple.com/app-store/review/guidelines/
- https://support.google.com/googleplay/android-developer/answer/6112435
