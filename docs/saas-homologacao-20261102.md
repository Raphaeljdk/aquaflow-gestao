# AquaFlow / Ducha Elitte — estado da homologação SaaS (02/11/2026)

**Status:** em desenvolvimento, branch `feat/saas-piloto-integracao-20261102`. NÃO liberar tenants reais ou cobranças em produção.

## Entregas verificadas

- Módulos dos PRs #42 e #46 reunidos em PR #48; treinamento de #47 mantido.
- Testes de proteção para uso de banco dedicado, licenças, expiração, valor/txid do Inter e notificações.
- Banco central QA `cool-hall-38102617`, com 10 tabelas de controle.
- Banco operacional QA A `sweet-salad-90812272`, B `damp-tooth-05353566`, cada um com 19 tabelas.
- Cada banco QA contém 1 cliente fictício; nenhum vínculo de usuário ativo ou licença de teste habilitada.
- Controle de ativação manual QA exige `READY`, banco criptografado, identidade/proprietário vinculado e licença `PENDING` nunca usada. O relógio de 168 horas começa na ativação, não na solicitação.
- Ambiente Vercel: `CONTROL_DATABASE_URL` e `SAAS_QA_MODE` protegidos para preview **exclusivo desta branch**.
- Production Vercel e Neon legados não alterados por esta implementação.

## Bloqueios reais antes do piloto de dois lava-rápidos

1. **Identidade central:** implementar login, convites de uso único, senhas seguras, vínculo obrigatório identidade/tenant e revalidação de licença.
2. **Roteamento integral:** migrar todas as APIs/CRUD, snapshot, atendimento rápido, agenda pública, suporte, relatórios, vistorias e anexos para Prisma do banco do tenant autorizado. Bloquear fallback para `DATABASE_URL`. UI não deve trabalhar em modo DEMO.
3. **Provisionamento:** criar worker durável, transações idempotentes, criação de projeto Neon, aplicação de migrations oficiais, armazenamento criptografado da conexão e atualização `READY` só após health-check. Atualizar histórico `_prisma_migrations` dos bancos QA ou reprovisionar via Prisma. Há estruturas criadas manualmente para QA; isso **não comprova migrations aplicáveis**.
4. **Teste A/B real:** com duas identidades autenticadas, executar criacão, edição, remoção e reabertura de comanda, placa repetida, saldo, relatórios, suporte, agendamento público, bloqueio após 168h e reversão após pagamento confirmado. Sem PII real.
5. **Prévia autenticada:** criar credenciais internas de QA pelo novo módulo de identidade central. Não reaproveitar login do banco legado nem anexar produção como banco operacional de preview.

## Bloqueios da etapa comercial

6. **Banco Inter:** no Inter Empresas, criar integração oficial, liberar Pix Cobrança/consulta, obter Client ID, Client Secret, certificado mTLS, chave privada e chave Pix; armazenar SOMENTE no cofre/Vercel. Homologar consulta de liquidação real, valor exato e idempotência de eventos.
7. **Plano mensal em débito:** selecionar e contratar adquirente/gateway que comprove débito recorrente automático de R$ 80/mês. A API Pix do Inter não processa cartão de débito. Não mudar a escolha do cliente para Pix Automático sem consentimento comercial.
8. **E-mail/WhatsApp:** domínio remetente verificado e serviço de e-mail; conta oficial Meta Cloud API com token/phone ID e templates aprovados. Só então habilitar a fila e o cron protegidos.
9. **Governança:** cotas/provisionamento/custos Neon para 1000+, fila e backoff, métricas, alerta, backup, recuperação, limites de conexões, testes de carga e integração contínua.

## Política comercial preservada

- Mensal: **R$ 80**, por débito conforme condição atual (precisa de gateway).
- Anual: **R$ 960** em 12 mensalidades; à vista **R$ 790** por Pix ou crédito 1x sem parcelas.
- Trial: **7 dias contados da ativação após READY**, preservando dados após expiração.

## Critério de release

A entrega não estará concluída apenas porque build e testes unitários passaram. Exigir testes E2E com as duas contas isoladas, revisão de migrações, observabilidade, segurança de segredo e autorização de produção. Nunca usar o banco de produção para teste de provisionamento, nem expor credenciais em GitHub/ChatGPT.

## Operações de QA adicionadas

- `GET /api/plataforma/saas/pilotos`: status sem credenciais, protegido por administrador da plataforma e `SAAS_QA_MODE`.
- `POST /api/plataforma/saas/pilotos/:id/ativar-teste`: valida requisitos e ativação única de 168 horas; falha fechada para tenant não preparado.

**Observação:** no estado atual do controle central, os dois tenants estão `PENDING` e não possuem membership nem conexão criptografada. A ativação deve e irá falhar até o worker, convites e identidade serem concluídos.
