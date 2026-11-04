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

## Preparação no ERP Web (fase adicional)

- `/integracoes`: painel somente leitura para ADMIN, com status e requisitos de 12 canais; funcionários não têm o link nem permissão.
- `GET /api/integracoes/canais`: catálogo de canais sem credenciais; exige sessão autenticada e ADMIN; cache privado desabilitado.
- `GET /api/mobile/v1/bootstrap`: contrato de contexto para apps com sessão web atual, licença e tenant validados pelo servidor; **não** substitui a futura autenticação OAuth/PKCE nativa.
- `src/lib/integrations/pos-contract.ts`: contrato de cobrança por conta recebedora do lava-rápido, valor em centavos e idempotência, com adaptador que rejeita cobranças até a implementação oficial.
- `tests/integration-*.test.ts`: testes para catálogo, RBAC e bloqueio de cobranças não homologadas.

## Condições para ativar pagamentos reais

1. Habilitar somente após SDK oficial, homologação e integração em sandbox e terminal autorizado.
2. Implementar a vinculação segura entre estabelecimento e conta recebedora com OAuth; nenhum identificador de conta enviado pelo app pode ser usado diretamente como autorização.
3. Conferir status por webhook assinado e consulta autenticada ao PSP; atualizar comanda somente após confirmação idempotente no backend; auditar estornos/cancelamentos.
4. Não misturar cobrança de licença do AquaFlow (Stripe ou regras dos marketplaces) com pagamentos presenciais dos lava-rápidos; na Cielo Store, avaliar o modelo comercial próprio da loja para não cobrar assinaturas duplicadas.
5. Em qualquer falha, rede indisponível ou terminal não autorizado, não marcar comanda como paga.

## Validação da fase atual

- O deploy de Preview da Vercel deverá passar por `npm run build:app`, incluindo `tsc`, testes e validação existente.
- **Build nativo Android, build iOS, testes de dispositivo e homologações não fazem parte deste ciclo; permanecem pendentes.**
- A aba será disponibilizada aos administradores somente depois de aprovação do PR e deploy, sem ativar cobrança.
