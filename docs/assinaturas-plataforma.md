# Assinatura Ducha Elitte — política de cobrança

## Escopo comercial

- **Mensalidade fixa da plataforma:** R$ 80,00 por estabelecimento, por mês.
- **Meio de pagamento previsto no cadastro:** exclusivamente cartão de débito.
- **Taxa única de implantação:** ainda precisa ser definida antes da contratação; não fazer cobrança implícita.
- **Destinatário financeiro:** ELITTE SCOUT LTDA, Banco Inter. Os dados bancários completos pertencem à configuração privada do prestador, **não** ao código público, HTML ou cadastro do lava-rápido.
- A receita de **lavagens e serviços** pertence ao estabelecimento, registrada no ERP com as formas de pagamento e dados financeiros próprios. Não misturar com o faturamento da assinatura.

## O que está implementado neste PR

O formulário público informa as condições e **não** coleta dados de cartão nem cobra nada. A rota de solicitações aplica o preço e o meio de pagamento **no servidor**; valores arbitrários enviados pelo navegador são ignorados. O painel central visualiza os novos dados; solicitações antigas preservam o método originalmente registrado e não recebem um preço retroativo inventado.

## Integração financeira pendente — não liberar como pagamento ativo

Dados de banco, agência, conta e CNPJ **não autorizam** débito online no cartão. A API pública do Inter documenta Pix, cobrança/boleto e Pix Automático, mas não fornece, por si só, o checkout de débito recorrente solicitado. Não confundir débito em conta/Pix Automático com cartão de débito.

Antes de aceitar pagamentos reais:
1. Confirmar contrato/credenciamento com adquirente ou gateway que **suporte cartão de débito online**, e avaliar como funciona a cobrança **mensal recorrente** nesse meio. Se não oferecer, definir um processo de renovação manual (com ciência do cliente) ou renegociar o meio aceito.
2. Cadastrar a ELITTE SCOUT LTDA como recebedora e validar conta bancária **no painel protegido do provedor**, nunca no repositório ou formulário público.
3. Criar sessão de checkout hospedada/tokenizada (PCI DSS), com HTTPS, validação de preço no servidor e sem armazenar número, CVV ou validade de cartão.
4. Implementar armazenamento de assinaturas/faturas e estado do pagamento, com vínculo **exclusivo à empresa assinante**, ID do provedor, idempotência e webhook autenticado. Não ativar assinatura com base apenas em redirecionamento do navegador.
5. Validar mensalidades, falhas, reembolsos, cancelamentos, comprovantes, testes sandbox e conciliação do recebedor.
6. Testar isolamento das receitas: comandas, relatórios de faturamento, QR Pix do estabelecimento e configurações comerciais da unidade **não** devem usar a conta bancária da ELITTE SCOUT.

**Estado atual:** somente apresentação, captação de leads e registro interno de preço/método. Não há transação real, checkout, assinatura bancária nem integração habilitada.

## Implantação

Aplicar a nova migration em ambiente de homologação antes do deploy. Depois de validar, aplicar em produção de forma controlada com backup e as variáveis do projeto existentes; não adicionar credenciais de banco/gateway ao GitHub. Conferir a nova solicitação no painel central e preservar as solicitações antigas.

## Dados do recebedor (configuração privada)

Os metadados bancários fornecidos foram cadastrados como variáveis **encrypted**, somente no ambiente **Production** do projeto `ducha-elitte` na Vercel:

- `PLATFORM_BILLING_BANK_CODE`
- `PLATFORM_BILLING_BENEFICIARY`
- `PLATFORM_BILLING_BENEFICIARY_CNPJ`
- `PLATFORM_BILLING_BRANCH`
- `PLATFORM_BILLING_ACCOUNT`

Essas variáveis apenas identificam a conta de destino e ainda **não são consumidas por um gateway**. O provedor contratado precisará validar a titularidade e habilitar o repasse para essa conta. Não acrescentar dados bancários aos arquivos públicos.
