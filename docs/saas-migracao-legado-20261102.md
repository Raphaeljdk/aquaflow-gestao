# Migração de dados reais — Ducha Elitte (2 de novembro de 2026)

## Escopo
Banco operacional original Neon: `lingering-voice-54405395` (projeto `ducha elitte`).
Controle central Neon: `soft-resonance-65429053` (`duchaelitte-central-producao`).
**Nunca** misturar solicitações de outros estabelecimentos com dados operacionais e jamais atribuir um banco a mais de um lava-rápido.

## Estado confirmado antes da migração
- Produção ainda usa `main` + banco operacional original até mudança planejada.
- Inventário prévio da base antiga (na última verificação bem-sucedida): 3 usuários, 6 comandas, 2 solicitações.
- O banco central tem um operador criado, mas não há evidência de migração dos registros.
- O acesso do Neon começou a responder HTTP 502 na tentativa de execução desta migração. Por segurança, **nenhuma cópia ou alteração no banco foi efetuada**.
- Faturamento real deve permanecer desativado até o fluxo de conciliação confirmado.

## Passos de corte obrigatório — não executar automaticamente no build
1. Confirmar o inventário atualizado pela rota autenticada `GET /api/plataforma/saas/migracao/diagnostico`.
2. Criar backup verificável do banco original antes da migração (snapshot ou branch de retenção no Neon); registrar branch ID, hora e totais sem credenciais.
3. Identificar explicitamente qual estabelecimento é dono das 6 comandas; as 2 solicitações da plataforma NÃO são necessariamente a mesma empresa. Não importar contas de gestão central como operadores da empresa.
4. Criar banco isolado do estabelecimento com cópia completa e consistente de todas as tabelas operacionais, incluindo FKs, índices, sequences, histórico e dados novos desde o primeiro snapshot. Não fazer corte se o legado continuar recebendo gravações.
5. Criar uma identidade central para cada usuário operacional com hash bcrypt existente preservado, mapear perfis `ADMIN/GERENTE/FUNCIONARIO` para `OWNER/MANAGER/EMPLOYEE`, verificar acesso sem duplicar operador central. Não copiar credenciais ou logins entre empresas.
6. Registrar a associação no banco central **somente após validar** o banco exclusivo, preenchendo `platform_tenants.neon_project_id` e `encrypted_database_url`; criar `platform_memberships` e `platform_entitlements`. Não marcar `READY` antes da validação. Decidir uma licença válida previamente sem criar pagamento fictício.
7. Comparar contagens e integridade das tabelas na origem e no destino; testar login, fluxo de comanda, estoque, agendamentos, suporte e dados históricos em dois estabelecimentos isolados.
8. Congelar brevemente novas operações no sistema legado, repetir a sincronização final se houver diferenças, e ativar o modo SaaS somente com roteiro de rollback testado.
9. Verificar envio do convite pelo Resend e eventos `invoice.paid`, estorno, falha, cancelamento e expiração no Stripe antes de `STRIPE_BILLING_ENABLED=true`.
10. Manter o projeto e o backup original preservados até confirmação do corte. Não apagar registros em produção nem reaproveitar o banco antigo como banco central.

## Bloqueio de implementação
A ferramenta do Neon retornou erro HTTP 502 repetidamente em ambos os links. Sem acesso operacional ao Neon, não é possível alegar que o snapshot/cópia existam nem mudar `SAAS_PRODUCTION_MODE` ou iniciar cobranças reais.
