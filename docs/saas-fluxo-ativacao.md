# SaaS Ducha Elitte — fluxo de ativação (QA)

1. Usuário solicita o teste no formulário: cria tenant e licença `PENDING` no banco central, **sem consumir 7 dias**.
2. Gestor da plataforma autentica pela identidade central privilegiada `platform_operators` e aprova: cria job de provisionamento idempotente `PENDING`.
3. Worker externo protegido seleciona o job, reconcilia projeto Neon existente se houver, provisiona **1 projeto Neon exclusivo**, executa `prisma migrate deploy` e valida tabela + histórico de migrações antes de marcar `READY`.
4. Gestor gera convite de uso único ao e-mail proprietário em ambiente protegido, ou o worker realiza envio com Resend validado.
5. Proprietário define uma senha segura no convite HTTPS. Transação única cria identidade/membership, inicia `TRIAL` com 168h, consome convite, audita. Idempotência e `FOR UPDATE` impedem reutilização.
6. Cada login valida vínculo, licença e readiness no controle central; APIs operacionais conectam exclusivamente ao banco Neon da unidade. Suspensão/expiração não apaga dados.
7. Inter só libera/renova licença após conciliação real; sem API, o piloto gratuito pode ser homologado sem cobrança.

## Infra pendente para ativação efetiva

- `NEXTAUTH_SECRET`, `TENANT_DB_ENCRYPTION_KEY`, `NEON_ORG_API_KEY` e ambiente seguro para worker; **não colar segredos em chats/commits**.
- Bootstrap do primeiro operador SaaS em `platform_operators` por script com senha criada em runner protegido.
- Resolver as bases QA antigas com migrations executadas manualmente: o worker deve usar novas bases ou reconciliar `_prisma_migrations`; **nunca executar migrate deploy sobre tabelas sem histórico**.
- Homologar ponta a ponta com dois proprietários fictícios em empresas diferentes e no celular.
- Não habilitar rotina de cobrança nem templates WhatsApp antes das credenciais bancárias e Meta serem validadas.
