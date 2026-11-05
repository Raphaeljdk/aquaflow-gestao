# Ducha Elitte — Política de publicação única

A produção é protegida por um **Ignored Build Step** na Vercel. O build só acontece quando o commit enviado à branch principal tem a marca **`[release]`**. Commits comuns e commits de PR não publicam o site.

## Processo obrigatório
1. Desenvolver em branch sem Preview automático e revisar alterações antes de enviar.
2. Executar `npm ci`, `npm run db:generate`, `npm run typecheck`, `npm test` e `npm run build:app` em CI, sem segredos de produção.
3. Fazer migração **aditiva** primeiro em branches isoladas Neon. Validar dois estabelecimentos, backups, permissões, cancelamentos, Pix e estoque.
4. Executar migração dos bancos operacionais autorizados, **inclusive os bancos dos clientes já cadastrados**, antes de liberar a UI.
5. Revisar o PR e só mesclar com título **`[release] ...`** depois dos testes. Isso provoca uma única tentativa de build de produção.
6. Verificar deploy Vercel READY, logs e teste de fumaça; se falhar, manter produção anterior e corrigir sem mais releases prematuros.
7. Não alterar flags financeiras sem homologação. Cobranças de assinatura via Stripe ficam no controle central, nunca nas chaves Pix das empresas clientes.

## Pix do ERP
- `Configuracao.pixChave` é legado e não pode receber comandas.
- `Configuracao.pixRecebimentoChave` e `pixRecebimentoAtivo` são exclusivos do banco operacional de cada lava-rápido e só o administrador pode alterar.
- O dono informa sua própria chave ou QR Code, confere o titular no banco e habilita recebimentos. O sistema **não consulta extratos nem faz conciliação automática**.
- O empregado somente marca Pix como pago após conferir o crédito no banco. Nunca use a conta da plataforma para as lavagens.

## Catálogo de produtos
Produtos e alimentos são separados dos serviços, com migrações versionadas, reserva por comanda, baixa só na finalização em transação e devolução manual registrada. Cada banco operacional tem seu próprio saldo; nunca gravar mercadorias no controle SaaS central.

## Projetos novos
Reaplicar `ignoreCommand` do `vercel.json` e configurar `previewDeploymentsDisabled=true` no projeto Vercel no momento da criação. Instalar CI adaptada à linguagem e bloquear merges sem revisão; a configuração **não é herdada automaticamente** por projetos recém-criados. Manual de emergência: Vercel permite ignorar o comando de build ao redeployar, mediante autorização do responsável.
