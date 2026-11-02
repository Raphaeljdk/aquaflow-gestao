# Ducha Elitte SaaS — execução técnica e liberações pendentes

Documento histórico de 2026-11-01, revisado para Stripe em 2026-11-02. A implantação comercial atual está em `docs/assinaturas-plataforma.md`. Esta branch é de **homologação** e NÃO substitui o sistema de produção nem libera clientes novos.

## Estado realmente comprovado

- Projeto Neon CENTRAL QA: `cool-hall-38102617` (São Paulo). Foram criadas tabelas centrais de tenants, identidades, memberships, licenças, cobranças, eventos, provisionamento, notificações e auditoria.
- Dois projetos Neon **operacionais QA**: `sweet-salad-90812272` (piloto A) e `damp-tooth-05353566` (piloto B). Em ambos foram aplicados os 97 comandos SQL das 15 migrações operacionais, criando 19 tabelas cada, sem dados de produção. Ambos têm o mesmo ID de cliente fictício, com nomes distintos. Isso comprova separação física das bases, mas ainda **não comprova** isolamento das rotas do ERP. **ATENÇÃO:** migrações foram aplicadas via SQL de homologação, não pelo histórico `_prisma_migrations`; antes do `prisma migrate deploy` é obrigatório reconciliar o histórico ou reprovisionar as bases com o migrador oficial.
- O controle central QA recebeu duas empresas fictícias vinculadas aos projetos A/B, ambos em status `PENDING` e licença `PENDING`. Nenhuma conta foi liberada.
- Código: regras fail-closed de teste de 7 dias, licença vencida, pagamento Stripe com webhook assinado e consulta autenticada (QA), segredos de bancos criptografados, cliente da API Neon e cron de vencimentos, fila de notificações, email/WhatsApp com templates.
- Treinamento: MP4 narrado e ilustrado produzido; precisa de hospedagem HTTPS e cadastro do link em Configurações → Como usar para ser reproduzido no ERP.

## Etapas para 1000 lava-rápidos sem misturar dados

1. Migrar **autenticação** e gestão de usuários para a base central, com convite individual, hashing bcrypt, vínculo explícito usuário↔tenant, revogação e trilha de auditoria. Nenhum tenant usa as contas do ERP legado.
2. Refatorar **todas** as rotas operacionais (snapshot, CRUD, relatórios, agenda pública, estoque, comanda, vistorias, anexos e suporte) para receber PrismaClient exclusivamente do banco autorizado. Bloquear a rota se não houver vínculo; **nunca retornar ao banco legado como fallback**.
3. Provisionamento automatizado usa job idempotente, aprovação, projeto Neon exclusivo, criptografia da credencial, migrations do ERP via worker fora da função serverless, validação de saúde e somente então marcar READY. Criar usuário por link de ativação de uso único, jamais senha padrão enviada em claro.
4. Ao marcar projeto READY e licença PENDING, iniciar 168 horas de TESTE no mesmo instante em transação central; bloquear acesso ao vencer. Não apagar dados ao expirar.
5. Reconciliar faturas e checkouts Stripe com HMAC do webhook, consulta na API e valor esperado; somente pagamentos confirmados ativam/renovam licença.
6. R$ 80/mês usa cartão de **crédito recorrente** pela Stripe. Pix (dependente da habilitação) somente para anual de R$ 790 à vista; não usar cartão de débito brasileiro.
7. Fila de notificações via domínio de email remetente verificado e WhatsApp Cloud Business com templates previamente aprovados. Sem credenciais, não enviar nem simular disparos.
8. Validar dois tenants com mesmo ID de cliente, placa e comanda: usuário A sem acesso ao B por UI, API, URL, relatórios, anexos e agendamento. Testar expiração, reversão por pagamento, retries, limite de conexões e 10/100/1000 tenants.
9. Migrar instância legada para projeto dedicado **somente após backup completo e plano de rollback**, sem expor dados privados ao operador central.

## Configuração segura de ambiente (não enviar segredos em chat)

Variáveis armazenadas nas configurações protegidas da Vercel/runner ou cofre privado:

```text
CONTROL_DATABASE_URL       # somente banco central, projeto exclusivo
NEON_ORG_API_KEY            # chave Neon da organização, acesso limitado
TENANT_DB_ENCRYPTION_KEY    # segredo AES-256 GCM, 32 bytes base64
CRON_SECRET                 # segredo para cron de vencimentos/reconciliação/avisos
STRIPE_BILLING_ENABLED      # false por padrão; true somente após QA
STRIPE_SECRET_KEY           # sk_test_..., apenas ambiente Preview QA
STRIPE_WEBHOOK_SECRET       # whsec_..., webhook assinado
STRIPE_PIX_ENABLED          # false até aprovação/habilitação Pix
RESEND_API_KEY              # ou substituir por fornecedor transacional escolhido
NOTIFICATION_FROM_EMAIL     # remetente em domínio verificado
WHATSAPP_BUSINESS_TOKEN     # token oficial da Meta
WHATSAPP_PHONE_ID
WHATSAPP_GRAPH_VERSION      # versão habilitada, por exemplo vXX.Y
WHATSAPP_TEMPLATE_LICENSE_STATUS # template aprovado em pt_BR sem parâmetros
```

Os endpoints `/api/cron/saas-expiry` e `/api/cron/saas-notifications` exigem `Authorization: Bearer <CRON_SECRET>`. O webhook `/api/stripe/webhook` usa assinatura Stripe, nunca CRON_SECRET.
**Não adicionar horários no vercel.json até o controle central estar conectado, as variáveis protegidas estarem cadastradas e os fluxos homologados.** Sem isso respondem erro seguro; não afetam operação legada.

## Stripe — substituição definitiva do Inter

Use a documentação `docs/assinaturas-plataforma.md` para configurar Stripe Checkout, segredos no Preview e webhook de teste. Não é necessária a API do Banco Inter. A conta bancaria de recebimento será informada no Dashboard Stripe. O Pix das lavagens continua sob controle individual de cada estabelecimento.

## Segurança e operação

- Chaves Stripe e segredos de webhook exigem armazenamento seguro, rotação e acesso mínimo.
- Limites/custos de Neon para 1000+ projetos devem ser negociados e aprovados antes de criar bancos indiscriminadamente.
- A API Neon de criação é não idempotente; após timeout, conferir se o projeto já foi criado antes de tentar novamente. Nomes de projeto determinísticos e jobs únicos no central reduzem duplicação.
- O webhook da Stripe nunca libera acesso sem assinatura válida, consulta autenticada e valor compatível.
- Registrar telemetria e alertas sem incluir senhas, certificados, tokens, links de acesso ou URLs PostgreSQL.
- Toda suspensão de licença preserva os dados do tenant, permitindo reativar após pagamento verificado.
- Proteja anexos e fotos por tenant, não apenas o PostgreSQL.

## Limitações atuais (não afirmar que está pronto)

- Autenticação e rotas do ERP legado **ainda usam DATABASE_URL global**. Projetos piloto QA têm apenas dados artificiais de isolamento, não as tabelas completas do ERP.
- Banco central QA não está conectado à Vercel; faltam segredos, jobs e autenticação central.
- O módulo de provisionamento cria projeto, mas não aplica migrations nem cria conta operacional; para isso precisa de worker durável e fluxo de convite.
- Pagamentos não são gerados, nem reconciliados em produção; provedor não configurado.
- O vídeo MP4 precisa ser hospedado sob HTTPS. O componente `Como usar` passa a aceitar URLs mp4/webm com controles, além de YouTube e Descript.

## Critério para release

- 100% dos testes unitários + QA com banco central separado e dois bancos operacionais;
- autorização cruzada com chamadas API negativas comprovadas;
- cobrança de homologação liquidada e duplicada processada uma única vez;
- e-mail e WhatsApp de teste enviados com opt-in;
- aprovar custos de infraestrutura e mensalidades e documentar plano de reversão;
- publicação canário e logs `READY`, sem migration destrutiva.
