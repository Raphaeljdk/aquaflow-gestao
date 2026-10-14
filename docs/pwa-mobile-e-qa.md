# AquaFlow — Instalação no celular e validação segura de QA

## Instalar no Android

Abra o endereço do AquaFlow no Chrome, acesse a tela de login e toque em **Instalar app**. Se a opção automática não estiver disponível, use o menu de três pontos > **Instalar app** ou **Adicionar à tela inicial**. O aplicativo abre em janela própria. Exige conexão à internet.

## Instalar no iPhone

Abra pelo Safari, toque no ícone **Compartilhar**, selecione **Adicionar à Tela de Início** e confirme. A identidade visual é a do AquaFlow; a marca particular do estabelecimento permanece dentro do seu painel.

## Configuração de QA isolado na branch codex/controles-por-lava-rapido

O deploy de preview atual exige configuração de banco isolado. A branch já conta com **DATABASE_URL** e **QA_EXPECTED_WHATSAPP** próprios de QA. A migration aditiva `202610140001_funcionario_permissoes` foi executada apenas depois da verificação do contato QA.

Para terminar, em Vercel > Projeto ducha-elitte > Settings > Environment Variables, adicione com target **Preview** e git branch exata `codex/controles-por-lava-rapido` os valores de **QA** das seguintes variáveis:

- `NEXTAUTH_SECRET` (de QA, diferente de produção);
- `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`;
- `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD`.

Use os valores já configurados no preview isolado `codex/agendamento-sem-cadastro-clientes` ou novos valores destinados exclusivamente ao QA. **Não compartilhe essas credenciais em mensagens** e não copie segredos de produção. Após ajustar, inicie um redeploy sem promover a produção.

Se qualquer teste de identificação do QA falhar, mantenha o deployment bloqueado. Sem isolamento multiempresa completo, não conecte unidades distintas ao mesmo banco.

## Observações de segurança

- O manifesto aponta ícones PNG 192 e 512 e Apple Touch 180, todos com identidade AquaFlow.
- O service worker não armazena páginas operacionais, dados de clientes nem informações de pagamentos.
- O alerta de `recharts`, o aviso `cache-dir` e a contagem do `npm audit` não são a causa do bloqueio do deploy. Auditar vulnerabilidades deve ser tarefa separada; não executar `npm audit fix --force` sem revisar alterações.
