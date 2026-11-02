# Ducha Elitte: arquitetura multiempresa com banco dedicado por lava-rápido

**Decisão obrigatória:** o ERP será um SaaS multiempresa para mais de 1.000 lava-rápidos. **Cada estabelecimento terá uma base PostgreSQL própria**, preferencialmente um projeto Neon exclusivo. Um único frontend Next.js/Vercel pode servir a todos, mas cada requisição operacional deve abrir somente o banco autorizado daquele estabelecimento.

## Estado real em 29/10/2026

O repositório atual **NÃO É MULTIEMPRESA**. `src/lib/prisma.ts` cria um cliente global a partir de `DATABASE_URL`, `src/lib/auth.ts` autentica contra essa base e rotas como `src/app/api/snapshot/route.ts`, `src/app/api/[entity]/[[...id]]/route.ts`, `src/app/api/atendimentos-rapidos/route.ts` e endpoints públicos usam a mesma conexão. Não existe `tenantId` consistente nas sessões, nem vínculos protegidos entre usuário e estabelecimento. **É proibido ativar múltiplos clientes no banco operacional atual.** A lista pública de parceiros não constitui isolamento de dados.

A base atual da Ducha Elitte deve ser tratada como **estabelecimento legado**, sem mover dados até cópia de segurança, mapeamento de proprietários, homologação e plano de reversão.

## Divisão dos dados

| Componente | Banco | Informações |
| --- | --- | --- |
| Plataforma (control plane) | **Projeto Neon central dedicado**, separado dos bancos operacionais | Estabelecimentos, proprietários, vínculos de usuários, planos, assinaturas, licenças, status do provisionamento, IDs de projetos Neon, referências de segredos, auditoria central, solicitações e chamados |
| Lava-rápido A | **Projeto Neon A / banco A** | Clientes, telefones, veículos, placas, vistorias, fotos, comandas, caixa, pagamentos da lavagem, serviços, estoque, funcionários operacionais, agenda, configurações, Pix do próprio estabelecimento, relatórios |
| Lava-rápido B | **Projeto Neon B / banco B** | Mesmas tabelas, **sem nenhuma conexão com a base A** |
| Lava-rápido N | **Projeto Neon N / banco N** | Isolamento idêntico, sem exceções para parceiros, funcionários, dashboards ou relatórios |

A plataforma central **não pode** receber o Pix das lavagens; conta Inter da Elitte Scout recebe apenas assinaturas da plataforma quando integrada e homologada. Os meios de pagamento da lavagem são da própria empresa.

## Fluxo de acesso obrigatório

1. O usuário entra em uma tela de login da plataforma. A identidade é autenticada **no banco central**, não em um banco operacional escolhido via cliente.
2. A aplicação lista os estabelecimentos aos quais essa identidade **tem vínculo ativo**. Se só houver um, seleciona-o; múltiplos exigem escolha validada no servidor.
3. O link `/empresa/[slug]` ou `/agendar/[slug]` é resolvido no banco central por um identificador imutável do tenant. O slug do navegador **não concede permissão**.
4. A API autentica usuário, consulta o vínculo `user_id + tenant_id` no servidor central e exige licença operacional permitida. Perfis devem restringir funções e escrituras.
5. A API busca no central a referência do segredo e o ID do projeto Neon, recupera a credencial do cofre no servidor e consulta **somente aquele banco**. URLs de conexão e chaves nunca são enviadas a navegador, JWT, respostas JSON, URL ou logs.
6. A autenticação central só autoriza o escopo; cada rota de operações deve receber explicitamente `TenantAccess` e cliente Prisma exclusivo. **Nunca fazer fallback para `DATABASE_URL` se faltar vínculo, licença ou segredo.**
7. Administradores da plataforma não podem abrir comandas de clientes por padrão. Suporte de emergência exige autorização temporária, justificativa, prazo e auditoria detalhada.

**OBS:** a rota pública de agendamento deve identificar um único estabelecimento pelo slug e fazer apenas as ações públicas permitidas, no banco certo. WhatsApp, e-mail e arquivos exportados não podem usar dados de outro tenant.

## Provisionamento de novos estabelecimentos

- Nova solicitação -> análise/aprovação comercial -> pagamento confirmado por webhook seguro -> evento idempotente -> trabalho em fila.
- Criar projeto Neon **dedicado** com chave de API de organização no backend, nomes determinísticos por `tenantId`; registrar projeto e referência de segredo em controle central.
- Criar identidade e perfil inicial, banco e role com permissões mínimas; executar migrações com URL **direta**, tráfego da aplicação com URL **pooled**; verificar versão e tabelas.
- Criar configurações iniciais sem clonar clientes, usuários ou dados de outro lava-rápido. Não copiar backup do banco legado para novos tenants.
- Somente marcar `PRONTO` quando projeto, credencial, migração, health check e isolamento passarem. Só permitir operação se licença estiver ativa, sem assumir que formulário aprovado = pagamento realizado.
- O processo deve resistir a chamadas duplicadas, falhas de rede e reprocessamento sem provisionar duas bases. Suspender acesso por cobrança **não** exclui banco nem histórico.
- O plano de R$ 960 (12x R$ 80) ou R$ 790 à vista não libera automaticamente sem provedor e conciliação reais.

## Escala e operação de 1.000+

- **Não criar 1.000 bancos vazios antecipadamente.** Provisionar conforme adesão; confirmar o limite de projetos permitido pelo contrato/organização Neon antes de abrir vendas em escala.
- Neon escala computação para zero quando o banco fica inativo, conforme configuração/plano. Usar pool por instância, limites de conexões, observabilidade, filas e limites de API para evitar exaustão.
- Aplicar migrações por lotes/versões, com acompanhamento de projeto, execução reversível quando possível e rollout canário antes de atualizar a frota.
- Backup/restauração, acesso ao suporte, exportação e exclusão devem ser **por projeto**. Não restaurar um único tenant sobrescrevendo outro.
- Dados e arquivos precisam de políticas de retenção, controles de acesso e proteção LGPD. Cada tenant deve ter prefixo/bucket autorizado no armazenamento de imagens e anexos; o isolamento não termina no PostgreSQL.
- Dashboard central apresenta somente metadados operacionais agregados e assinaturas; leitura de faturamento específico exige autorização e trilha de auditoria.
- Testes de concorrência e vazamento: A não acessa B mesmo com id/placa iguais, alteração do header/cookie/slug, login expira, funcionário muda de estabelecimento, licença suspensa, upload/QR/link público, webhook duplicado e 1.000 tenants inativos/ativos.

## Plano de migração (sem assumir que já está funcionando)

**Fase 0 — Segurança:** manter sistema atual somente para a Ducha Elitte. Não transformar `ParceiroLavaRapido` em inquilinos operacionais e não mesclar PR #39 enquanto a plataforma central não estiver segura.

**Fase 1 — Controle central:** criar um **novo** projeto Neon central, usando o modelo em `architecture/multiempresa/control-plane-schema.sql` como base para um projeto/migração Prisma própria. Separar entidades de autenticação central, cobrança, tenant e membership. Criar segredos no servidor; provisionamento desabilitado até homologar.

**Fase 2 — Isolamento em dados:** refatorar todas as rotas e `src/lib/repository.ts` para aceitar cliente Prisma do tenant autorizado, sem `prisma` global; revisar `currentUser()`, snapshot, mutações, relatorios, agendamento público, estoque, caixa, suporte, exportações e callbacks. O helper `src/lib/tenancy/boundary.ts` é apenas uma *base fail-closed*, **ainda não conectado às rotas legadas**.

**Fase 3 — Provisionamento piloto:** ativar 1 tenant de teste separado, com banco vazio e migrações; criar 2º tenant e provar isolamento total com testes automatizados de autenticação, APIs, arquivos e pagamentos. Deixar QA preparado sem dados reais misturados.

**Fase 4 — Migração controlada do legado:** copiar a base atual para o projeto exclusivo da Ducha Elitte com backup válido e rollback. Proteger dados existentes, reconectar usuários existentes e só depois alterar o domínio para roteamento por tenant. Não excluir o banco antigo antes de validar.

**Fase 5 — Escala:** instrumentar fila, retries, criação de projetos por cliente, monitoramento e rollout canário; testar 10, 100 e depois 1.000 tenants, conexão e custo. Avaliar formalmente quotas/plano do Neon e custos de Vercel, tráfego, armazenamento e WhatsApp.

## Critérios de aceitação para dizer "multiempresa concluído"

- `/api/snapshot`, todas as mutações, relatórios e URLs públicas usam a instância do tenant; não há acesso a operacional via global `DATABASE_URL`.
- Dois estabelecimentos conseguem usar o mesmo nome, placa, ID de comanda ou e-mail comercial em bancos distintos sem conflito operacional.
- Usuário A não lê, cria, edita ou exporta dados de B por nenhum endpoint ou arquivo, inclusive com chamadas forjadas.
- Novos tenants são criados por fila idempotente, sem intervenção manual em variáveis Vercel por cliente.
- Cada tenant pode ser restaurado/atualizado/desativado sem afetar outros. Suspensão preserva todos os dados.
- Assinaturas centrais e pagamentos de lavagens permanecem totalmente separados e auditáveis.
- Todos os testes passam no preview e a migração legada é homologada antes de qualquer promoção de produção.

## Referências

- Neon: https://neon.com/blog/control-planes-for-database-per-user-in-neon
- Neon: https://neon.com/blog/migrating-schemas
- Neon: https://neon.com/blog/neon-for-agent-platforms
- Next.js: https://nextjs.org/docs/app/guides/multi-tenant
- Guia de projeto para padrões de provisão: https://neon.com/docs/guides/platform-integration-overview

**Observação de infraestrutura atual:** a organização Neon já atingiu limites ao tentar criar branches e snapshots no projeto atual. A arquitetura de 1.000 projetos exige avaliar cotas/licenciamento apropriados e não deve depender de criar 1.000 branches dentro do projeto legado.
