# AquaFlow — integração de assinaturas com Stripe (QA)

## Condições comerciais
| Plano | Total | Meio | Licença |
| --- | ---: | --- | --- |
| Anual em 12 mensalidades | R$ 960 | 12 cobranças mensais de R$ 80 no cartão de crédito | Um mês por fatura paga |
| Anual à vista | R$ 790 | Pix (se habilitado) ou crédito em 1x | Doze meses por pagamento confirmado |

O teste gratuito dura 168 horas após ativação, sem cartão. O cadastro nunca inicia cobrança.

**Limitações no Brasil:** cartões de débito brasileiros não são aceitos na Stripe. O Pix não serve para assinaturas recorrentes e, na precificação brasileira, pode depender de convite. Confirmar ativação no Dashboard.

O recebimento de assinaturas é exclusivamente da pessoa jurídica titular da plataforma. Pagamentos de lavagens e serviços dos lava-rápidos continuam em seus meios próprios e bancos separados.

## Passos para homologar
1. Criar e verificar conta em https://dashboard.stripe.com, preenchendo CNPJ da empresa recebedora, representante e conta bancária de repasse.
2. Alternar Dashboard Stripe para **Modo de teste**. Em Desenvolvedores → Chaves de API, copiar a chave **secreta de teste** para `STRIPE_SECRET_KEY` na Vercel, ambiente Preview QA. Nunca enviar chaves em chat nem commitar.
3. Em Stripe Webhooks/Event destinations de teste cadastrar `https://SEU-PREVIEW/api/stripe/webhook`, com eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded` e `invoice.paid`. Copiar segredo de assinatura `whsec_...` para `STRIPE_WEBHOOK_SECRET` da Vercel Preview.
4. Vercel Preview QA: `SAAS_QA_MODE=true`, `STRIPE_BILLING_ENABLED=true`, `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`, `STRIPE_PIX_ENABLED=false` (até a Stripe liberar Pix).
5. Fazer backup e aplicar **somente no banco central QA** a migração aditiva `architecture/saas/stripe-billing-migration-20261102.sql`. Nunca aplicar nos bancos dos tenants.
6. Se o Preview estiver protegido, autorizar entregas da Stripe na rota assinada sem abrir outras rotas do painel.
7. Redeploy do Preview e, no painel da plataforma, criar um checkout de teste para proprietário de tenant READY. Nenhum link é gerado pelo cadastro público. Usar apenas cartão de teste da Stripe.
8. Conferir eventos HTTP 200, identificar tenant e valores de R$ 80 ou R$ 790, verificar expiração/reativação e reenviar o mesmo webhook para confirmar idempotência. Testar pagamento recusado e dois tenants isolados.
9. Após habilitação oficial de Pix para a conta e teste real de Checkout de Pix, liberar `STRIPE_PIX_ENABLED=true` no QA.
10. Só considerar produção após validar tratamento de estorno, contestação, inadimplência, cancelamento e regras de 12 mensalidades; credenciais live devem ficar isoladas do Preview.

## Regras de segurança
- `success_url` **não** libera licença. O servidor valida HMAC e consulta Stripe por API antes de ativar.
- O webhook está desabilitado fora do QA nesta implementação; aceita apenas eventos test-mode e segredo privado. Em produção permanece sem cobrança.
- O código do Inter deixou de processar cobranças. Dados históricos e migrações antigas são preservados para auditoria.
- Cada tenant tem banco operacional próprio. Assinaturas e licenças permanecem no controle central.
- As 12 mensalidades têm encerramento automático planejado ao final do 12º pagamento; revisar contrato e falhas de renovação antes de cobrar clientes reais.

```bash
npm ci
npm run typecheck
npm test
npm run build:app
```

Referências:
https://docs.stripe.com/payments/checkout
https://docs.stripe.com/webhooks/signature
https://support.stripe.com/questions/accepted-payment-methods-in-brazil?locale=pt-BR
https://stripe.com/br/pricing
