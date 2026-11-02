# AquaFlow / Stripe — preparação de produção (02/11/2026)

## Estado verificado
- Neon: `duchaelitte-central-producao` (`soft-resonance-65429053`, São Paulo), projeto distinto do banco central QA, dos dois pilotos QA e do banco legado. As 13 tabelas `platform_*` foram criadas em transação no **novo banco central de produção**; nenhum tenant ou usuário foi inserido.
- Vercel `ducha-elitte`: nomes `CONTROL_DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PIX_ENABLED`, `STRIPE_BILLING_ENABLED` existentes no alvo Production. **Os valores são secretos e não foram lidos**, logo não há confirmação de que a conexão/flag estejam corretas.
- GitHub: PR #48 em DRAFT, não mesclado à `main`; a versão publicada na `main` ainda **não** possui `/api/stripe/webhook`. Não é seguro habilitar cobranças.
- O processamento de incidências Stripe está preparado para registrar e alertar; **não** altera automaticamente o período pago por contestação/reembolso sem reconciliação contratual.

## Travamentos intencionais
1. `STRIPE_BILLING_ENABLED` deve permanecer literalmente `false` em Production. Uma variável cadastrada com nome correto não assegura seu valor.
2. Não configurar `SAAS_PRODUCTION_MODE=true` até migrar, revisar e bloquear todas as rotas operacionais legadas. O modo real também exige `VERCEL_ENV=production`, `sk_live_...`, `whsec_...`, `CONTROL_DATABASE_URL`, `NEXT_PUBLIC_DEMO!=true`.
3. `SAAS_QA_MODE` não pode estar ligado em produção. Segredos da Stripe nunca vão em `NEXT_PUBLIC_*` ou repositório.
4. Não fazer merge do PR #48 ou adicionar rota pública de checkout até que a produção SaaS valide autenticação central, convites, licença, provisionamento e isolamento de todos os módulos.
5. Não criar cobranças por pedidos de cadastro/teste; só mediante aceitação explícita do proprietário e condições comerciais.

## Ainda obrigatório antes de produção
- [ ] Conferir a **URL real** do `CONTROL_DATABASE_URL` na Vercel com a instância `soft-resonance-65429053` sem exibir senha em logs nem chat; conferir acesso e privilégios mínimos.
- [ ] Implementar `SAAS_PRODUCTION_MODE` em **todas** as rotas do ERP (não somente no gateway Stripe), sem fallback a `DATABASE_URL` antigo; habilitar login, operador central e permissões de produção.
- [ ] Proteger endpoints de abertura de checkout com operador central autenticado e validação estrita do tenant, do proprietário, do contrato e do pagamento já vigente.
- [ ] Definir quando o contrato de 12 mensalidades acaba, quando há cancelamento automático e o tratamento de faturas atrasadas/contestadas; testar a 12ª e impedir 13ª cobrança; decisões de reembolso/contestação requerem conciliação com demais pagamentos.
- [ ] Instalar reconciliação periódica autenticada (para eventos Stripe não entregues), alertar falhas, revisar idempotência e retenção de auditoria.
- [ ] Confirmar domínio HTTPS público e endpoint live `https://duchaelitte.com.br/api/stripe/webhook`, com assinatura HMAC verificada no corpo bruto.
- [ ] Cadastrar no Dashboard Stripe live os eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created` e `charge.dispute.closed`. Não usar as mesmas chaves de webhook do Preview.
- [ ] Homologar alterações através de CI, inspeção do Preview, revisões de segurança, duas empresas com bancos separados, evento duplicado, cobrança recusada, cancelada, contestada e reembolso; depois revisão final antes do primeiro pagamento real.
- [ ] Validar se Pix está realmente habilitado na conta Stripe. A mera presença da flag `STRIPE_PIX_ENABLED` não libera o método.

## Rotina de cobrança segura
Receber Stripe event -> validar assinatura e modo -> consultar Stripe usando chave server-side -> validar valor, moeda, tenant e referência -> registrar transação idempotente no controle central -> atualizar licença -> notificar. O retorno à página de sucesso jamais confirma pagamento.

Em estornos/contestações/falhas: consultar o recurso real na Stripe; registrar incidente e notificar; revisar o direito de uso com base em todas as faturas vinculadas antes de bloquear dados. A expiração da licença é independente e **não apaga** dados dos estabelecimentos.

## Referências
https://docs.stripe.com/webhooks/signature
https://docs.stripe.com/billing/subscriptions/webhooks
https://docs.stripe.com/api/subscriptions/update
