# Webhook Stripe — domínio canônico de produção (02/11/2026)

A Vercel está configurada para redirecionar `duchaelitte.com.br` -> `www.duchaelitte.com.br` com HTTP 308. Um webhook Stripe deve apontar **diretamente para o domínio final** sem redirecionamento; respostas 3xx podem ser classificadas como falha pela Stripe.

O destino deve ser ajustado no painel da Stripe para:

`https://www.duchaelitte.com.br/api/stripe/webhook`

**Atenção:** ajustar o endpoint **na Stripe** exige acesso ao painel da própria conta. Não é necessário alterar/copiar o valor `STRIPE_WEBHOOK_SECRET` se estiver apenas editando a URL no mesmo destino. Se o destino for recriado, atualizar o segredo de assinatura na Vercel Production e fazer um novo deploy.

A aplicação autoriza `https://duchaelitte.com.br` e `https://www.duchaelitte.com.br` como origens de produção, com correspondência exata.

Antes de ativar `SAAS_PRODUCTION_MODE` e `STRIPE_BILLING_ENABLED`, confirmar operador central, conexão ao banco correto, checkout Stripe, entrega do webhook `200` e o limite de doze mensalidades.

Sem operadores, tenants ou cobranças reais inseridas na central até esta verificação.
