# Migração segura da instância legada para SaaS multiempresa

**Estado:** roteiro e ferramenta criados; transferência de dados de produção **ainda não executada**. Manter `SAAS_PRODUCTION_MODE=false` e `STRIPE_BILLING_ENABLED=false`.

## Diagnóstico verificado (02/11/2026)

- Projeto Neon legado: `lingering-voice-54405395`, configurado como estabelecimento **Ducha Talento**.
- O banco operacional contém 3 contas, 5 clientes e 6 comandas; também guarda 2 solicitações comerciais aprovadas.
- Central exclusiva: `soft-resonance-65429053`, com 1 administrador, sem empresas e sem memberships.
- Os bancos `sweet-salad-90812272` e `damp-tooth-05353566` são de QA, **não são** o destino de produção.
- O middleware de isolamento rejeita, corretamente, usar o host de `DATABASE_URL` como banco exclusivo.

## Procedimento (não pular etapas)

1. Antes da janela de migração, capturar um snapshot/backup do legado e registrar o momento. Garantir ausência de escrita de novas comandas durante a cópia para não perder alterações.
2. Criar **um novo projeto Neon de produção**, de propriedade exclusiva do estabelecimento legado. Configurar acesso mínimo e `sslmode=require`. Nunca usar o projeto central nem os dois projetos de QA.
3. Aplicar nele o mesmo conjunto de migrações Prisma já usado pelo ERP. Confirmar tabelas operacionais existentes **vazias** e compatíveis.
4. Em um executor privado com cliente PostgreSQL compatível, configurar `LEGACY_DATABASE_URL` e `TENANT_DATABASE_URL` como segredos. Executar `node scripts/migrate-legacy-tenant.mjs` para inventário de contagens, sem escrever.
5. Conferir o inventário e janela de backup. Executar com `MIGRATION_APPLY=YES` para restaurar os dados ao destino com `pg_restore --single-transaction`. Conferir contagens e integridade dos registros.
6. Validar funções críticas do destino: contas, comanda, clientes, estoque, histórico, agendamento, vistoria e suporte; confirmar que nenhum registro de outro lava-rápido foi misturado.
7. Vincular a empresa legada a `platform_tenants` no banco central, com `encrypted_database_url` gerado pela aplicação usando `TENANT_DB_ENCRYPTION_KEY`, `neon_project_id` do projeto novo e a licença de transição explicitamente definida. Nunca gravar URL em plaintext.
8. Migrar identidades e memberships com mapeamento explícito de proprietário/funcionários. Não transformar automaticamente um administrador central em proprietário nem compartilhar tokens/senhas.
9. Tratar as 2 solicitações antigas separadamente: são leads aprovados, não registros operacionais do mesmo lava-rápido. Concluir o provisionamento específico de cada interessado antes de criar convite de acesso.
10. Fazer um teste de login e comanda por empresa, verificando que cada usuário acessa **somente** o seu projeto Neon. Validar rollback para a antiga versão, se necessário.
11. Confirmar Resend e webhook Stripe com fluxo autorizado, conciliando uma transação real controlada. Somente após validação e aprovação da operação habilitar as flags, acompanhando o primeiro recebimento.

**Não considerar a importação concluída somente por existir projeto/tabelas.** O script jamais ativa pagamentos ou logins, pois essas ações exigem validações adicionais. Nunca publicar `DATABASE_URL` nem senhas de usuários em GitHub, logs, chat ou documentação.
