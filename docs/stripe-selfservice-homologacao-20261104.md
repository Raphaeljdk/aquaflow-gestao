# Ducha Elitte — aceitação Stripe / checkout próprio
Data: 2026-11-04. Operação: **proteger o ERP legado até homologação completa**.

## Fluxo implementado

1. Um proprietário com empresa `READY`, banco Neon exclusivo vinculado e identidade `OWNER` verificada abre `/assinatura`.
2. Informa **seu próprio e-mail** e recebe do remetente já verificado um link individual válido por 20 minutos (sem exibir se um endereço existe).
3. O link só pode criar **um** checkout. Não contém ID de tenant nem segredos Stripe.
4. O cliente escolhe: mensal R$ 80 no cartão; contrato de 12 mensalidades de R$ 80 no cartão; anual R$ 790 no cartão à vista ou Pix (quando autorizado pela Stripe).
5. Redirecionamento de sucesso **não ativa licença**. O webhook validado contra a API da Stripe concilia o pagamento e atualiza `platform_entitlements`.
6. As transações são registradas exclusivamente no banco de controle central, não no banco operacional de outro estabelecimento.
7. O retorno do Checkout consulta `/api/assinatura/status` e mostra confirmado somente quando o livro-razão contém liquidação validada.
8. A renovação é feita pela Stripe na assinatura; a licença é estendida **somente** no evento `invoice.paid` comprovado. Contratos anuais com cobrança mensal são limitados a 12 ciclos.
9. Pix com confirmação assíncrona não libera conta na conclusão inicial do Checkout.

## Portas de segurança (não desabilitar para obter um teste verde)

- `STRIPE_BILLING_ENABLED=true` e chave/verificação do webhook do **mesmo ambiente**.
- `SAAS_PRODUCTION_MODE=true` somente **após** comprovar isolamento multiempresa e preservar os acessos do ERP legado.
- `SAAS_QA_MODE=true` e `STRIPE_SECRET_KEY=sk_test_...` somente no Preview para testes de checkout.
- `STRIPE_PIX_ENABLED=true` somente depois de o método estar habilitado na conta Stripe correta; **nunca adivinhar** a elegibilidade.
- `CONTROL_DATABASE_URL` apontando exclusivamente para o banco central, separado do banco legado.
- Não modificar o titular/conta Stripe do dono principal; Freitas Corp Connect é uma implantação separada.

## Verificações necessárias antes do dinheiro real

- [ ] Acesso do proprietário antigo ao ERP permanece funcionando com os dados originais.
- [ ] Dois estabelecimentos criados no QA têm bancos distintos e não veem informações um do outro.
- [ ] Preview com chave Stripe **teste**: compra anual cartão R$ 790 e mudança de licença ao receber webhook de teste.
- [ ] Preview: Pix de teste, quando disponível, mantém estado pendente antes de `async_payment_succeeded`.
- [ ] Preview: compra mensal R$ 80 no cartão e recebimento de `invoice.paid`.
- [ ] Preview: evento `invoice.paid` duplicado **não** estende a licença novamente.
- [ ] Preview: recusa, expiração de Checkout e estorno produzem incidente auditável.
- [ ] Preview: controle de 12 mensalidades não permite 13ª cobrança; validar simulação temporal da Stripe.
- [ ] Preview: segundo checkout para a mesma empresa com sessão pendente é bloqueado.
- [ ] Produção: verificar URL `https://www.duchaelitte.com.br/api/stripe/webhook` na conta Stripe dona do sistema.
- [ ] Produção: confirmar assinatura `whsec_` do endpoint e eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
- [ ] Produção: conferir o método Pix habilitado na Stripe, se oferecido ao cliente.
- [ ] Realizar **uma compra real autorizada e controlada** após todos os itens, verificando assinatura, eventual reembolso e acesso do cliente.
- [ ] Só então divulgar a página de checkout como disponível para o público.

## Diagnóstico

A página `/assinatura` consulta `/api/assinatura/disponibilidade`. Caso a configuração não esteja pronta, mostra o contato comercial sem capturar cartão nem iniciar cobranças. A liberação do checkout real permanece **desacoplada** da publicação do código.

O banco central ganhou a tabela `platform_checkout_access_tokens` e o campo `stripe_checkout_session_id` por migração aditiva. Não altera projetos operacionais nem executa cobrança durante migração.

**Não declarar 100% homologado sem checkout e webhook com a Stripe conectada.** Testes unitários e build da Vercel não substituem confirmação da operadora.
