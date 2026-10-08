# AquaFlow — Gestão de Lava Rápido

> **Publicação temporária para avaliação:** a interface no branch `main` abre diretamente em `/dashboard`, usa somente dados fictícios na memória do navegador e não solicita login. As alterações desaparecem ao recarregar. O código de autenticação e PostgreSQL está preservado para ativação posterior; a interface atual não grava no banco. Não insira dados reais nesta publicação.

Aplicação em português com **Next.js 16 (App Router), TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 6 + PostgreSQL, NextAuth Credentials, Zod, React Hook Form e date-fns**. Next.js 16 atende ao requisito 14+.

## Estoque de materiais

Em **Estoque**, gestores cadastram materiais com unidade, custo unitário e saldo mínimo. A equipe registra entradas e saídas com quantidade e observação; o saldo é atualizado e saídas acima do disponível são bloqueadas. O painel destaca materiais no mínimo ou abaixo dele e exibe as movimentações recentes. A demonstração apresenta dados fictícios e reinicia ao recarregar. No modo PostgreSQL, execute `npm run db:migrate` antes de usar o módulo.

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

Para redefinir a senha de um administrador já criado, execute `npm run admin:password` em um ambiente confiável com `DATABASE_URL`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` definidos. O comando exige uma conta ADMIN ativa e grava apenas o hash bcrypt; não registre a senha no repositório nem a passe como argumento de linha de comando.

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

Para uma avaliação temporária **sem banco**, configure `NEXT_PUBLIC_DEMO=true` na Vercel e faça um novo deploy. Acesse `/login` e clique em **Explorar demonstração**: não há e-mail nem senha. O modo demonstração usa apenas dados fictícios na memória do navegador; alterações somem ao recarregar e não são compartilhadas entre usuários. Não use esse modo para dados reais. Antes de colocar a aplicação em produção, remova `NEXT_PUBLIC_DEMO` (ou defina `false`), configure o PostgreSQL e execute migração e seed.

O build valida o código, mas não cria tabelas nem administrador. Sem migração e seed, a aplicação publicada não consegue atender ao login. Nunca coloque a URL do banco ou senhas no repositório ou em mensagens públicas.

Se `/login` falhar no pré-render com `ERR_INVALID_URL` e `input: ''`, verifique `NEXTAUTH_URL` na Vercel. Uma variável criada com valor vazio causa esse erro no NextAuth. O projeto agora usa `VERCEL_URL` durante o build nesse caso, mas configure `NEXTAUTH_URL` com a origem HTTPS definitiva e faça um novo deploy para autenticação em produção.

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

| Recurso | Administrador | Funcionário |
| --- | --- | --- |
| Clientes e veículos dentro do cliente | Gerenciar | Gerenciar |
| Comandas e agendamentos | Gerenciar | Gerenciar |
| Dashboard, faturamento e comissões | Acesso total | Sem acesso |
| Funcionários e liberação de login | Acesso total | Sem acesso |
| Estoque, catálogo e configurações | Gerenciar | Sem acesso às páginas de gestão |

Os perfis legados GERENTE, ATENDENTE e LAVADOR seguem as permissões de FUNCIONARIO. O funcionário acessa apenas Clientes, Comandas e Agendamentos; o snapshot fornece os serviços e responsáveis necessários à operação, sem dados de contas, comissões ou estoque. A navegação e `src/proxy.ts` protegem páginas; **todas as APIs verificam a sessão e relêem usuário ativo/cargo no banco**. Alterações de cargo e desativação valem na próxima chamada à API, mesmo com um JWT ainda válido.

### Liberação de acesso para teste

1. Em um ambiente de teste com banco separado, entre como administrador e abra **Funcionários → Liberar acesso**.
2. Informe um e-mail válido, escolha Administrador ou Funcionário e defina uma senha com pelo menos 10 caracteres. Mantenha o cadastro ativo.
3. Salve e confira o indicador **Login liberado**, o e-mail e o perfil. Cadastro operacional sem senha não cria login.
4. Em uma janela separada, teste o login: administrador inicia no Dashboard; funcionário em Clientes. Teste também URLs diretas de áreas restritas e o logout.
5. Cadastre cliente e veículo, abra uma comanda, inicie a lavagem, confira o pagamento e finalize. Teste agendamento e conversão em comanda.
6. Desative o cadastro ao encerrar o teste. Não publique senhas no GitHub e não use contas compartilhadas em produção.

O PDF `Qrcode thiago.pdf` recebido nesta tarefa contém uma página em branco, sem imagem ou QR Code. Ele não substitui a configuração PIX existente. É necessário reenviar uma imagem válida do QR para finalizar essa parte da entrega.

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

Mantenha backup do banco, HTTPS e segredos no provedor. O snapshot atual carrega o histórico completo e atualiza a cada 30 segundos, adequado para uma unidade pequena. O PIX exibe o QR configurado e registra o recebimento confirmado manualmente pelo operador; exibir o QR não comprova o pagamento. Cartão é registro manual após aprovação na maquininha. Não há conciliação bancária automática.

## Verificação da revisão de acessos

- 27 testes automatizados de domínio, escopo de dados, permissões e proxy com JWT.
- TypeScript validado; nenhuma mudança em schema ou migrations.
- O banco real não foi validado nesta revisão: nenhuma variável de conexão disponível e a conexão Vercel recusou o acesso ao projeto.
- Login com contas reais, ativação dos usuários de teste e fluxo completo com persistência dependem da reconexão do ambiente. Não promover para produção antes dessa validação.
- QR de Thiago pendente de reenvio; PDF recebido em branco.
