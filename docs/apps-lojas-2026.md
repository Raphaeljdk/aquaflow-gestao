# Distribuição AquaFlow — Point, Google Play e Apple App Store

Status: **fase 1 / base técnica**, sem publicação ou liberação de cobranças.

## Arquitetura

| Destino | Base | Estado |
| --- | --- | --- |
| Android / Google Play | `apps/mobile` (Expo SDK 58 / React Native) | Prévia nativa, autenticação e operações ainda não integradas |
| iPhone / Apple App Store | `apps/mobile` (mesmo projeto) | Prévia nativa, autenticação e operações ainda não integradas |
| Point Smart 2 / Loja de Apps MP | `apps/point-smart` (Android Kotlin) | UI nativa sem SDK; pagamentos **desabilitados** |
| ERP web | `src/` (Next.js / Vercel / Neon) | Mantido sem alterações |

### Invariantes do SaaS multiempresa

1. Cada estabelecimento conserva seu banco Neon exclusivo.
2. O backend central autenticará quem pode operar em qual tenant. Nunca
   aceitar o banco/tenant enviado pelo app como prova de autorização.
3. Nenhuma credencial, token administrador ou URL PostgreSQL nos binários.
4. Pagamentos presenciais de um lava-rápido pertencem à conta Mercado Pago
   daquele estabelecimento, nunca à conta central da plataforma.
5. Toda comanda paga exige reconciliação, idempotência e auditoria.
6. Suspensão por licença e permissões de usuário também valem nos apps.

## Bloqueadores de distribuição

- Mercado Pago: aprovação comercial, SDK, terminal debug, Sandbox e homologação;
  distribuição de SmartApps é controlada.
- App Store: inscrição Apple Developer, app nativo útil, recursos completos,
  privacidade, revisão e testes TestFlight.
- Play Store: conta Play Console, verificação, política de dados, testes e AAB.
- Assinaturas B2B: validar políticas específicas das lojas para acesso a
  assinaturas empresariais adquiridas fora do app.
- Os requisitos de faturamento/SDK e regras de loja **não** são atendidos
  apenas com a PWA existente.

## Checklist de entrega

- [x] Criar branch isolada sem modificar o ERP de produção
- [x] Preparar esqueleto Android/iOS e projeto nativo Point
- [ ] API autenticada e telas operacionais nativas ponta a ponta
- [ ] SDK oficial e credenciamento SmartApps Point
- [ ] Teste de pagamento real autorizado + cancelamento + conciliação
- [ ] Teste multi-tenant automatizado e permissões
- [ ] TestFlight e Google Play teste fechado/interno
- [ ] Ícones, assets, política privacidade, screenshots e textos
- [ ] APK Point homologado e publicação controlada
- [ ] Publicação Apple e Google após aprovação

Links oficiais:
- https://www.mercadopago.com.br/developers/pt/docs/smartapps/overview
- https://www.mercadopago.com.br/developers/pt/docs/smartapps/deployment
- https://developer.apple.com/app-store/review/guidelines/
- https://support.google.com/googleplay/android-developer/answer/14151465?hl=pt-BR
