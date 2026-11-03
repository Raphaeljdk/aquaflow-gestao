# Migração de dados reais — Ducha Elitte (2 de novembro de 2026)

## Escopo
Banco operacional original Neon: `lingering-voice-54405395` (projeto `ducha elitte`).
Controle central Neon: `soft-resonance-65429053` (`duchaelitte-central-producao`).
**Nunca** misturar solicitações de outros estabelecimentos com dados operacionais e jamais atribuir um banco a mais de um lava-rápido.

## Estado confirmado antes da migração
- Produção ainda usa `main` + banco operacional original até mudança planejada.
- Inventário prévio da base antiga (na última verificação bem-sucedida): 3 usuários, 6 comandas, 2 solicitações.
- O banco central possui um operador e a cópia está preparada para vinculação controlada.
- O Neon apresentou HTTP 502 inicialmente, mas voltou a responder. A cópia foi feita para o novo projeto independente `young-mountain-12503839`, em São Paulo. Foram aplicadas as 15 migrações e copiados 3 usuários, 5 clientes, 5 veículos, 7 serviços, 1 funcionário, 6 comandas, 7 itens e 1 configuração; hashes das linhas comparados e iguais entre origem e destino. Sequência de comandas preservada no valor 233. O banco original permaneceu intocado.
- Faturamento real deve permanecer desativado até o fluxo de conciliação confirmado.

## Passos de corte obrigatório — não executar automaticamente no build
1. Confirmar o inventário atualizado pela rota autenticada `GET /api/plataforma/saas/migracao/diagnostico`.
2. Branch e snapshot adicionais do Neon estão no limite de quota; não apagar backups existentes. O banco original permanece íntegro como origem e rollback, e a cópia independente já foi criada.
3. A configuração operacional da origem está identificada como **Ducha Talento**; os dois pedidos de plataforma NÃO são parte dos dados desse estabelecimento. Os pedidos e parceiros globais permanecem somente no banco antigo. Não importar login de gestão central como operador do estabelecimento.
4. Banco isolado, esquema e registros operacionais já foram copiados e conferidos. Antes do corte, repetir comparação das tabelas e sincronizar escritas que surgirem após a cópia.
5. Criar uma identidade central para cada usuário operacional com hash bcrypt existente preservado, mapear perfis `ADMIN/GERENTE/FUNCIONARIO` para `OWNER/MANAGER/EMPLOYEE`, verificar acesso sem duplicar operador central. Não copiar credenciais ou logins entre empresas.
6. Registrar a associação no banco central **somente após validar** o banco exclusivo, preenchendo `platform_tenants.neon_project_id` e `encrypted_database_url`; criar `platform_memberships` e `platform_entitlements`. Não marcar `READY` antes da validação. Decidir uma licença válida previamente sem criar pagamento fictício.
7. Comparar contagens e integridade das tabelas na origem e no destino; testar login, fluxo de comanda, estoque, agendamentos, suporte e dados históricos em dois estabelecimentos isolados.
8. Congelar brevemente novas operações no sistema legado, repetir a sincronização final se houver diferenças, e ativar o modo SaaS somente com roteiro de rollback testado.
9. Verificar envio do convite pelo Resend e eventos `invoice.paid`, estorno, falha, cancelamento e expiração no Stripe antes de `STRIPE_BILLING_ENABLED=true`.
10. Manter o projeto e o backup original preservados até confirmação do corte. Não apagar registros em produção nem reaproveitar o banco antigo como banco central.

## Estado do vínculo
O cron `/api/cron/saas-legacy-link` registra a cópia validada no banco central somente quando `LEGACY_MIGRATION_LINK_ENABLED=true` e **ambas as flags SaaS e Stripe estão desativadas**. A empresa fica em `PROVISIONING`, licença `PENDING` e sem acesso, até o corte final. Qualquer divergência de conteúdo impede o vínculo. A ativação de `SAAS_PRODUCTION_MODE` e cobranças reais continua bloqueada até verificação da transição, sessões e licenças.
