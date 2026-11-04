# AquaFlow — monetização Stripe Connect (proposta de implementação)

Data: 2026-11-04. Estado: **ESPECIFICAÇÃO, NÃO ATIVADO**.

## Regras comerciais solicitadas

- Cada **venda avulsa recebida** pelo checkout integrado: taxa de plataforma de **R$ 1,00 (100 centavos)**, uma vez por pagamento elegível.
- Cada **cobrança de assinatura de serviços do lava-rápido** recebida pelo checkout integrado: taxa de plataforma de **R$ 2,00 (200 centavos)**, uma vez por pagamento elegível. Assim, a cobrança recorrente de assinatura aplica R$ 2 por mensalidade efetivamente paga; regra **confirmada pelo proprietário da plataforma**: comissão em cada mensalidade efetivamente paga, não somente na adesão inicial.
- Assinaturas SaaS cobradas pela **própria Ducha Elitte** (planos de R$ 80 e R$ 790) são **produto separado**. Nunca aplicar taxa de R$ 2 às cobranças de licença da plataforma por engano.
- Venda de assinatura e venda avulsa são **mutuamente exclusivas para fins de comissão**: não acumular R$ 1 + R$ 2 no mesmo pagamento.
- **Decisão comercial confirmada:** a comissão é descontada do valor devido ao estabelecimento, e **nunca acrescentada ao preço pago pelo cliente**. A conta Stripe atual do proprietário deve permanecer operacional e não pode ser desconectada, sobrescrita nem ter suas chaves substituídas. Valor líquido ao recebedor também depende das tarifas Stripe e tributos.
- Não cobrar em registros de comanda, agendamentos, vendas em dinheiro, maquininhas externas, pagamentos falhos, teste, cancelamentos ou duplicidades. Para canais externos, seria necessário outro fluxo de faturamento acordado, nunca débito automático presumido.
- Validar política de vendas de valor pequeno (valor da taxa não pode ultrapassar o total recebido), política de estornos parciais/integrais, disputas e sua reversão financeira.

## Arquitetura alvo

1. Utilizar a conta Stripe **já existente da Freitas Corp**, sob titularidade jurídica verificada, com Stripe Connect e chaves próprias. Conta Stripe do proprietário e de cada lava-rápido permanece preservada como recebedora comercial, conectada por onboarding oficial (OAuth ou Accounts API quando suportado); não aceitar chaves secretas dos lojistas na interface.
2. Registrar no plano de controle central apenas `tenant_id`, `stripe_connected_account_id`, situação de onboarding, capacidades e política de comissão; manter dados operacionais nos bancos exclusivos por tenant. Criptografar dados sensíveis e restringir acesso.
3. Criar endpoint de checkout operacional que confirme tenant, titular, checkout e natureza da venda (AVULSA ou ASSINATURA_LAVARAPIDO), exigindo política contratual aceita e conta conectada apta. Usar Connect com modelo de charge compatível (direct/destination, conforme responsabilidade e disponibilidade regional). Para avulsa usar taxa fixa em centavos no pagamento; para recorrência investigar e implementar taxas fixas por fatura/PaymentIntent com comportamento suportado pela Stripe, pois `application_fee_percent` de assinatura é percentual, não fixo.
4. Persistir ledger central append-only (`tenant_id`, `sale_id`, `stripe_account_id`, `payment_intent_id`, `invoice_id`, `fee_type`, `fee_cents`, `currency`, `status`, `reversal_id`, `occurred_at`) com unicidade por cobrança e tipo. Conferir pagamentos via webhook assinado, conta de origem e consulta autenticada à Stripe antes de reconhecer receita; usar idempotência no checkout e no webhook.
5. Separar rotas, segredos e webhooks de **faturamento da plataforma SaaS** e **pagamentos operacionais Connect**, preservando o comportamento atual de `/api/stripe/webhook`. Segredos de teste e live por ambiente Vercel, sem commits.
6. Painel do administrador central: receita líquida/bruta, taxa por tenant, contagem de avulsas e assinaturas, totais R$ 1/R$ 2, custos do processador, estornos, falhas e exportação; estabelecimento enxerga sua taxa de plataforma e seus repasses conforme contrato.
7. Implementar homologação com duas contas conectadas de teste, dois tenants isolados, valores diferentes, webhooks repetidos e fora de ordem, estorno, disputa, vendas canceladas, credenciais revogadas, pagamento parcial, limite de 100/200 centavos e 1.000 tenants concorrentes.
8. Habilitação em produção **somente após** testes, aprovação comercial, aceite contratual dos lava-rápidos, validação contábil/tributária e confirmação das capacidades Stripe Brasil para o modelo escolhido. Não migrar nem tocar dados financeiros existentes sem backup e reconciliação.

## Exemplos confirmados de divisão de valores (antes das tarifas Stripe)
- Venda de R$ 50,00: cliente paga R$ 50,00; estabelecimento recebe R$ 49,00 antes das tarifas do processador; Freitas Corp recebe R$ 1,00.
- Mensalidade de lavagem de R$ 100,00: cliente paga R$ 100,00; estabelecimento recebe R$ 98,00 antes das tarifas do processador; Freitas Corp recebe R$ 2,00.
- Nunca cobrar R$ 1,00 cumulativamente sobre a mensalidade de assinatura (exclusividade de classificação).
- O arranjo Connect não deve prometer preservar a conta do lojista como tecnicamente a conta plataforma: pode ser necessário autorizá-la como connected account. Isso requer consentimento expresso do titular e verificação do modelo suportado no Brasil. **Não usar chaves Stripe do proprietário como chaves Connect da Freitas Corp.**
- Antes do lançamento, verificar responsabilidade por tarifas de processamento, estornos e chargebacks e informar o valor real dos repasses ao estabelecimento.

## Configuração sugerida (somente referência; não ativar sem implementar)

```env
STRIPE_CONNECT_ENABLED=false
STRIPE_PLATFORM_SALE_FEE_CENTS=100
STRIPE_PLATFORM_MEMBERSHIP_FEE_CENTS=200
# STRIPE_CONNECT_WEBHOOK_SECRET=<definir exclusivamente na Vercel>
# STRIPE_CONNECT_PLATFORM_SECRET_KEY=<chave exclusiva da conta Connect Freitas Corp, manter separada da STRIPE_SECRET_KEY do SaaS>
```

**Observação importante:** o fluxo atual `src/lib/saas/stripe-gateway.ts` cria checkouts para a LICENÇA DO ERP e o webhook `src/app/api/stripe/webhook/route.ts` valida valores fixos de R$ 80/R$ 790. Não alterar esses módulos para pagamentos de lavagens sem separar os fluxos e revisar testes. Este documento, por si só, **não implementa split nem gera comissão**.
