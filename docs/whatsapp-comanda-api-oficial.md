# Ducha Elitte — PDF completo e WhatsApp oficial

## Recursos incluídos
- PDF autenticado da comanda com serviços, quantidades, preços, produtos, descontos, total, pagamento, dados de veículo e mapa vetorial das avarias. O PDF de vistoria original continua disponível.
- Compartilhamento nativo de PDF via iPhone/Android quando suportado. No computador, o PDF é baixado e a conversa é aberta: **o usuário precisa anexar manualmente** no WhatsApp Web.
- Envio automático de arquivo sem funcionário **somente pela WhatsApp Business Platform (Meta Cloud API)** com autorização expressa do cliente, envio ativo no estabelecimento e template aprovado com cabeçalho DOCUMENT.
- O cliente autoriza **Ducha Elitte em nome do lava-rápido**. Registro no banco da empresa com usuário/data; revogação e resposta PARAR auditadas. A autorização não é inferida do cadastro do telefone.
- Registro idempotente por comanda. Estados PENDING, PROCESSING, SUBMITTED, DELIVERED, READ, FAILED, UNKNOWN, CANCELED. SUBMITTED é aceitação pelo provedor, **não significa entregue**.
- Upload de PDF para Meta por HTTPS com Bearer privado; não deixar documento exposto por link público nem salvar tokens no navegador.

## Configuração externa da Meta — obrigatória
1. Ter conta WhatsApp Business Platform regular, app Meta e número empresarial permitido. Definir o remetente que representará a **Ducha Elitte**.
2. Aprovar na Meta um modelo de categoria **Utilidade** com idioma `pt_BR` e **cabeçalho do tipo DOCUMENT**, corpo informativo estático. Exemplo nome interno `comanda_documento` (precisa existir e estar aprovado).
3. No projeto Vercel `ducha-elitte`, cadastrar **somente como segredo Production**:
   - `WHATSAPP_CLOUD_API_TOKEN` — token válido com permissão de mensagem;
   - `WHATSAPP_PHONE_NUMBER_ID` — identificador do telefone empresarial;
   - `WHATSAPP_COMANDA_TEMPLATE_NAME` — nome exato do template aprovado;
   - `WHATSAPP_GRAPH_API_VERSION` — versão API Meta, exemplo `v24.0`;
   - `WHATSAPP_META_APP_SECRET` — chave de assinatura para webhooks;
   - `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — segredo de desafio para confirmação do webhook;
   - `WHATSAPP_COMANDA_ENABLED` — inicialmente `false`, só ativar depois de testes.
4. Configurar no Meta o callback HTTPS `https://www.duchaelitte.com.br/api/whatsapp/webhook` e assinar os eventos de mensagens/status. Testar desafio e assinatura HMAC. Conferir template aprovado no gerenciador Meta; a existência de variáveis no Vercel não garante aprovação.
5. Num **lava-rápido de QA**, o dono abre Configurações e ativa envio automático, depois registra consentimento numa comanda de teste, finaliza e confere o status. Nunca usar número de cliente real no teste sem autorização.
6. Ativar a flag de envio só após confirmar domínio, webhooks, logs, consentimento, 24h e limites. Se ocorrer timeout após requisição à Meta, status UNKNOWN exige revisão manual antes de reenviar.

## Por que WhatsApp Web não envia anexo automaticamente
A URL `wa.me` prepara texto e abre conversa. Ela não permite anexar arquivos pelo navegador programaticamente. Para enviar um PDF sem cliques, o sistema usa a API oficial de mídia e mensagens da Meta.

## Política de 24 horas
Contatar clientes exige consentimento. Mensagens iniciadas pela empresa ou fora da janela de 24 horas requerem modelo previamente aprovado. Por isso esta integração usa sempre um template de utilidade de documento, e não texto livre.

## Segurança e multiempresa
A chave e conta do **Pix operacional** permanecem próprias de cada lava-rápido e **não têm relação** com o WhatsApp Business da plataforma. As comandas, autorizações e filas são mantidas nos bancos individuais; não compartilhar PDFs, telefones ou status entre tenants. Crons são protegidos por `CRON_SECRET`; webhook Meta valida assinatura HMAC. Envios e PDFs privados não criam links públicos.

## Limitações e aceite
- É necessário testar o envio e confirmar eventos reais com conta Meta autorizada; teste unitário e build não substituem esse aceite.
- O cron distribui até 12 estabelecimentos a cada minuto como recuperação, enquanto a finalização ativa o worker pós-commit; avaliar serviço de fila dedicado ao ampliar a operação para centenas ou milhares de estabelecimentos.
- A política de cancelamento impede enviar a partir do estágio PENDING/FAILED após opt-out. Uma mensagem em envio pela Meta não pode ser recolhida.
- O WhatsApp Business não permite afirmar que a mensagem foi lida sem o webhook de leitura efetivo.
- O template utilitário pode ter custos conforme a política de preços vigente da Meta.
