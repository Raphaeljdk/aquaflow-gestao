# AquaFlow — Gestão de Lava Rápido

Aplicação em português com **Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 6 + PostgreSQL, NextAuth Credentials, Zod, React Hook Form e date-fns**. Next.js 16 atende ao requisito 14+.

## Aplicação e demonstração

- **Aplicação completa:** `src/`, autenticação real, APIs protegidas e persistência PostgreSQL. Requer seu banco e variáveis de ambiente.
- **Demonstração navegável:** exportação estática das mesmas telas, com dados fictícios e alterações apenas na memória da sessão. Recarregar reinicia a demonstração. Não usa banco, login real ou persistência e não deve receber dados pessoais reais.
- A criação de contas, validação de credenciais e concorrência PostgreSQL são funções do servidor completo. Os perfis não são simulados no link de demonstração.

## Experimentar sem banco

```bash
npm ci
npm run build:demo
npm run dev:demo
```

Abra http://localhost:4173. A demonstração usa dados fictícios e reinicia ao recarregar. Para salvar dados de verdade, siga a configuração PostgreSQL abaixo.

## Iniciar localmente

Requisitos: Node.js 22 LTS ou superior compatível, npm e PostgreSQL 16+ (ou Docker).

```bash
npm ci
cp .env.example .env
docker compose up -d db
```

Edite `.env`:

| Variável            | Uso                                                    |
| ------------------- | ------------------------------------------------------ |
| DATABASE_URL        | URL PostgreSQL; o exemplo corresponde ao Docker local  |
| NEXTAUTH_URL        | Origem da aplicação, por exemplo http://localhost:3000 |
| NEXTAUTH_SECRET     | Segredo aleatório, gere com o comando abaixo           |
| SEED_ADMIN_EMAIL    | E-mail do primeiro administrador                       |
| SEED_ADMIN_PASSWORD | Senha escolhida para o seed, mínimo 12 caracteres      |
| NEXT_PUBLIC_DEMO    | Mantenha false na aplicação real                       |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Abra **http://localhost:3000/login**. Use o e-mail e a senha definidos no seed. Nenhuma senha de administrador é embutida no código.

O seed é idempotente: preserva dados existentes e não redefine senhas. Os funcionários de exemplo são cadastros operacionais; habilite cada acesso em **Funcionários → Editar**, informando e-mail e senha.

O Docker expõe o PostgreSQL apenas em localhost. A senha padrão do compose é exclusivamente para desenvolvimento; configure credenciais próprias no seu ambiente real.

## Build e implantação

```bash
npm run build:app
npm start
```

Hospede em Node.js, Vercel ou outro ambiente compatível com Next.js e PostgreSQL. Configure as variáveis do servidor, use HTTPS, aplique `prisma migrate deploy` uma vez no processo de entrega e execute o seed apenas quando desejar os dados fictícios. Nunca use `NEXT_PUBLIC_DEMO=true` em produção.

### Publicar na Vercel

1. Conecte o repositório GitHub ao projeto Vercel, com o diretório raiz na raiz deste repositório. `vercel.json` usa `npm ci` e `npm run build:app`; não publique `out/`, que é apenas a demonstração sem banco.
2. Crie um PostgreSQL acessível pela Vercel e configure `DATABASE_URL`, `NEXTAUTH_SECRET` (valor aleatório de pelo menos 32 bytes) e `NEXTAUTH_URL` (URL pública, com HTTPS) no ambiente Production. Configure também Preview separadamente se for usar prévias. Não exponha segredos com prefixo `NEXT_PUBLIC_`.
3. Antes de liberar o sistema, execute `npx prisma migrate deploy` apontando para o banco de produção em um ambiente confiável. Para o primeiro acesso, execute `npm run db:seed` com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (mínimo 12 caracteres). O seed inclui registros fictícios; avalie antes de usá-lo com um cliente real.
4. Faça o deploy pelo Git conectado e valide `/login`, autenticação, abertura e finalização de uma comanda. A Vercel publica novos commits automaticamente; o GitHub Actions apenas verifica tipos, testes e build, sem necessitar de `VERCEL_TOKEN` ou iniciar uma segunda publicação.

O build valida o código, mas não cria tabelas nem administrador. Sem migração e seed, a aplicação publicada não consegue atender ao login. Nunca coloque a URL do banco ou senhas no repositório ou em mensagens públicas.

`npm run build` produz o build completo e também a demonstração estática. `npm run build:demo` cria uma cópia temporária em `.sites-demo`, remove exclusivamente dessa cópia as rotas de API e o proxy de autenticação e gera `out/`. Nenhum arquivo do servidor original é removido. A publicação Sites usa apenas `out/`.

Para novos ambientes sem dados fictícios, crie o administrador e os serviços necessários por um seed adaptado antes do primeiro uso.

## Módulos

| Rota           | Recursos                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| /login         | Login Credentials, sessão JWT de 8 horas e logout                                           |
| /dashboard     | KPIs do dia, gráfico 7/30 dias, ranking e fila                                              |
| /clientes      | Cadastro, edição, exclusão condicionada, busca por nome/telefone/placa e histórico          |
| /veiculos      | Placa única, proprietário, tipo, marca, modelo, cor, ano e histórico                        |
| /servicos      | Catálogo, preços, duração e ativação/desativação                                            |
| /comandas      | Múltiplos serviços, desconto, responsável, quadro/tabela, pagamento, entrega e cancelamento |
| /agendamentos  | Calendário semanal, disponibilidade por duração, cancelamento e conversão em comanda        |
| /funcionarios  | Cadastro operacional, acesso opcional, cargos, taxas de comissão e produtividade            |
| /relatorios    | Período, faturamento, produtividade, pagamentos, CSV e PDF                                  |
| /configuracoes | Dados da empresa, logo, dias e horários de funcionamento                                    |

## Perfis e autorização

| Recurso                     | ADMIN           | GERENTE              | ATENDENTE  | LAVADOR                       |
| --------------------------- | --------------- | -------------------- | ---------- | ----------------------------- |
| Clientes, veículos e agenda | Gerenciar       | Gerenciar            | Gerenciar  | Sem acesso                    |
| Comandas                    | Gerenciar       | Gerenciar            | Gerenciar  | Iniciar somente as atribuídas |
| Catálogo                    | Gerenciar       | Gerenciar            | Consultar  | Sem acesso à página           |
| Funcionários                | Todos os perfis | Atendentes/lavadores | Sem acesso | Sem acesso                    |
| Relatórios e configurações  | Sim             | Sim                  | Não        | Não                           |

O lavador vê somente seus atendimentos no snapshot; ele não recebe pagamento nem finaliza a comanda. A finalização é feita pelo atendimento após confirmar o recebimento. A navegação e `src/proxy.ts` protegem páginas; **todas as APIs verificam a sessão e relêem usuário ativo/cargo no banco**. No Next.js 16, o middleware chama-se proxy. Alterações de cargo e desativação valem na próxima chamada à API, mesmo com um JWT ainda válido.

Senhas usam bcrypt (custo 12). Há limite de 10 tentativas por e-mail em 15 minutos, persistido no banco. Senhas nunca fazem parte do snapshot. Formulários NextAuth usam CSRF; APIs de escrita verificam a origem. Não há recuperação automática de senha: o administrador define uma nova em Funcionários.

## Regras de negócio

- Valores do cliente não definem o preço: o servidor consulta o catálogo.
- Cálculos monetários em centavos; persistência Decimal(12,2).
- Desconto nunca excede o subtotal.
- Fluxo: AGUARDANDO → EM_LAVAGEM → FINALIZADO → ENTREGUE.
- Cancelamento permitido apenas antes da finalização.
- Iniciar requer lavador ativo; finalizar requer forma de pagamento.
- Comissão usa o total após desconto e a taxa vigente na conclusão; ambos ficam registrados. Uma comanda não pode gerar comissão novamente.
- Veículo não pode possuir duas comandas ativas, incluindo veículos prontos para retirada.
- Cliente e veículo são validados em conjunto.
- Um agendamento ocupa a soma da duração dos serviços. Horários sobrepostos, passados, fora de funcionamento ou fora do intervalo são rejeitados.
- A agenda trabalha com **um veículo por vez** e fuso America/Sao_Paulo. Não há divisão por box nesta versão.
- Converter só é permitido no dia agendado, uma vez, dentro da mesma transação da comanda.
- O histórico é preservado: serviços/equipe são desativados; clientes/veículos vinculados não são excluídos.
- A empresa deve manter ao menos um administrador ativo.
- O relatório reconhece receita em finalizadoEm, incluindo FINALIZADO e ENTREGUE. CSV inclui proteção contra fórmulas e PDF é gerado por jsPDF.

Operações de escrita usam transação PostgreSQL e advisory lock para serializar as validações de fila/agenda. Índice parcial único e exclusion constraint na migração também protegem duplicidade e sobreposição diretamente no banco. A abordagem prioriza integridade para uma unidade de pequeno porte. Para alto volume, substitua o snapshot integral por consultas paginadas e locks mais granulares.

## API

Autenticação: `/api/auth/[...nextauth]`.

`GET /api/snapshot`: dados filtrados pelo usuário.

Rotas `/api/clientes`, `/api/veiculos`, `/api/servicos`, `/api/funcionarios`:

- GET lista, GET /:id, POST, PATCH /:id, DELETE /:id.
- DELETE em serviços/funcionários desativa; não apaga o histórico.

`/api/comandas`: GET, POST e PATCH /:id para status, pagamento e responsável.

`/api/agendamentos`: GET, POST e PATCH /:id com `{status:"CANCELADO"}` ou `{action:"convert",funcionarioId:"..."}`.

`/api/configuracoes`: GET/PATCH.

`GET /api/relatorios?inicio=2026-09-01&fim=2026-09-30&formato=csv` (ou pdf): somente gerente/admin.

## Estrutura

```text
prisma/
  schema.prisma
  seed.ts
  migrations/
src/
  app/
    (auth)/login/
    (dashboard)/
    api/
  components/
    ui/
    forms/
    layout/
  hooks/
  lib/
    auth.ts
    prisma.ts
    domain.ts
    repository.ts
    reports.ts
    validations/
  types/
  proxy.ts
tests/
scripts/
```

## Validação

```bash
npm run typecheck
npm test
npx prisma validate
npm run build:app
```

Os testes cobrem permissões, transições, pagamento, precisão de dinheiro, comissão, veículo duplicado, horários sobrepostos, conversão e integridade do histórico. A demonstração e a aplicação utilizam as mesmas regras de domínio; as garantias de concorrência dependem do PostgreSQL.

## Operação

Mantenha backup do banco, HTTPS e segredos no provedor. O snapshot atual carrega o histórico completo e atualiza a cada 30 segundos, adequado para uma unidade pequena. Pagamento registra o recebimento informado pelo atendente; não realiza cobrança bancária nem conciliação com adquirentes. PIX nesta versão é uma forma de pagamento registrada, sem geração de QR Code ou integração bancária.

## Resultado da verificação

- Build Next.js e exportação estática concluídos.
- 16 testes de domínio aprovados.
- Migração e restrições SQL verificadas em PostgreSQL embarcado (PGlite): pagamento obrigatório, fila única e horários sem sobreposição.
- Autenticação com credenciais e integração completa com uma instância externa PostgreSQL precisam de validação no seu ambiente configurado.
- Ferramentas WebMCP têm detecção de suporte; o navegador de revisão não ofereceu essa API.
