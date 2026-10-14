# AquaFlow — segurança dos acessos e isolamento por lava-rápido

## Estado desta entrega

- O **login público** tem identidade independente AquaFlow e não lê o nome, a logo ou o telefone configurado pelo proprietário.
- Dentro do painel, o proprietário com perfil ADMIN personaliza os próprios dados da instância, horários e contato de agendamento.
- O catálogo em **Serviços** permite criar, editar e desativar serviços e preços.
- Em **Funcionários**, o administrador pode criar logins com senha e escolher quais módulos cada funcionário pode acessar.
- As permissões são verificadas nas APIs, não somente na navegação.
- A conta PLATFORM_ADMIN_EMAIL é excluída das operações da unidade e continua responsável somente pelas funções centrais da instância.
- Clientes não exigem cadastro antecipado; o histórico é acumulado após a entrega dos serviços.

## O que ainda não é multiempresa

Este código **ainda não tem tenantId** nas tabelas de operação. Portanto todos os logins criados dentro do *mesmo banco* continuam pertencendo à mesma instância de lava-rápido. A aprovação de novas empresas no painel central NÃO provisiona banco, deploy, domínio ou proprietário isolado.

É proibido cadastrar vários estabelecimentos no mesmo banco como se os dados estivessem isolados. Não exponha acesso de uma empresa ao banco de outra.

## Implantação segura de novas unidades até haver isolamento multiempresa real

1. Criar **um projeto e banco de dados Neon exclusivos** para cada lava-rápido (ou projeto com isolamento físico equivalente, verificado). Não usar banco de produção de outra unidade.
2. Criar **um projeto Vercel exclusivo** e configurar DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL e demais variáveis daquele estabelecimento. Nunca reutilizar a mesma URL de banco entre unidades.
3. Provisionar um login de proprietário ADMIN exclusivo da unidade e uma conta funcional do estabelecimento; nunca compartilhar credenciais.
4. Executar somente migrations versionadas e validadas, em banco novo ou cópia de QA identificada, com backup e rollback preparados.
5. Verificar login ADMIN e funcionário, módulos liberados, CRUD de serviços, atendimento rápido, agendamento, entrega, catálogo e isolamento físico dos dados.
6. Ajustar nome, logo, WhatsApp, expediente e pagamentos no painel Configurações daquela instância.
7. Registrar separadamente domínio, projeto, banco e responsável pelo suporte. O painel central atual registra e analisa solicitações, mas o provisionamento é manual.

## Próxima etapa obrigatória para hospedagem multiempresa unificada

Adotar identificador de estabelecimento (tenantId) em User, Funcionario, Configuracao, Cliente, Veiculo, Servico, Comanda, Agendamento, ItemComanda, Material e demais entidades. É necessário filtrar TODAS as consultas e escritas por tenantId autenticado, também em rotas públicas de agendamento, relatórios, vínculos, migradores, índices únicos e busca. Implantar testes automatizados que tentem acessar IDs de uma unidade pela sessão de outra. Somente então habilitar provisionamento automático e visão consolidada de unidades.

## Ambiente de QA

A branch de preview exige QA_EXPECTED_WHATSAPP para reconhecer seu banco de QA. Sem esse valor (ou se o WhatsApp real do banco não coincidir), o build deve falhar antes de migrar dados. Não desabilite esta proteção apenas para obter um preview.
