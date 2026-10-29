# Feedback de validação — 7 vídeos e 3 áudios de 28/10/2026

Revisão audiovisual das telas da Ducha Elitte. Este documento separa solicitação, código entregue e dependências externas para evitar marcar como implementadas funções sem processamento real.

## 1. Pedidos extraídos das gravações

1. **Comandas / vistoria:** concluir checklist de danos e compartilhar relatório PDF pelo WhatsApp do telefone cadastrado na comanda. Documento deve ser produzido sem tornar detalhes dos veículos públicos.
2. **Agenda:** botão para copiar o link do agendamento público e distribuí-lo pelo WhatsApp, Instagram, grupos e status. Pedidos continuam sujeitos à confirmação do estabelecimento.
3. **Plataforma:** registrar CNPJ, endereço, e-mail e nome do responsável do parceiro. Área de acessos deve futuramente listar somente proprietários por estabelecimento, com número de contas de cada um.
4. **Comercial:** mensalidade de R$ 80 no contrato anual de R$ 960; plano anual à vista por R$ 790 (Pix Inter ou crédito 1x). O valor falado de R$ 950 em uma demonstração não substitui as instruções comerciais mais recentes de R$ 960.
5. **Falha de pagamento:** identificar assinatura inadimplente, avisar o gestor, colocar licença pendente/bloqueada e restabelecer acesso automaticamente após confirmação de liquidação. O desbloqueio não deve exigir novo cadastro.
6. **Notificações:** o proprietário da plataforma quer receber novos cadastros, recusas de cartão e bloqueios **por e-mail e WhatsApp**. Solicitou e-mail adicional como redundância caso o telefone seja perdido.
7. **Inter / maquininha:** confirmar com o Banco Inter se é necessário credenciamento de adquirência ou gateway para cartão e se o débito recorrente é tecnicamente suportado. A API Pix por si só não processa cartões.
8. **Vídeo explicativo:** material de treinamento passo a passo dentro da área autenticada *Como usar*, evitando divulgar telas internas na página de login. O vídeo real ainda precisa ser produzido/fornecido.
9. **Estoque / Serviços / Equipe / Faturamento:** manter gestão de materiais, serviços editáveis, cadastro de funcionários e comissões, PDF e Excel; as gravações confirmam esses fluxos como existentes, não solicitam alteração específica adicional.
10. **Domínio:** apontar o domínio comprado no Registro.br para a Vercel e validar HTTPS e link público canônico.

## 2. Implementado nesta branch

- Campos de parceiro `responsavel`, `endereco`, `cnpj`, `email` no schema, validação, rotas privadas do painel central e formulários. Migração SQL **aditiva** (sem excluir parceiros históricos).
- Geração local de PDF da vistoria salva, com identificação do estabelecimento, cliente, veículo, status dos oito pontos e observações.
- Download do PDF e compartilhamento nativo de arquivo em dispositivos compatíveis. Como **links do WhatsApp não anexam arquivo**, o fallback baixa o PDF e abre a conversa para anexar manualmente; não alegar envio automático.
- Botões de copiar/compartilhar o endereço público na aba Agendamentos; usam URL da instância e exigem WhatsApp de agendamento válido.
- Testes de regressão dos novos campos, checklist e link.

## 3. Bloqueios reais / não entregue

- **Nenhuma cobrança ou conciliação automática ainda:** API Pix Inter depende de credenciais, certificado mTLS, homologação e webhook; cartões dependem de gateway/adquirente contratado. Sem eventos bancários autenticados, **não bloquear nem liberar contas**.
- **Sem notificação automática externa ainda:** requer e-mail corporativo do gestor, provedor transacional (remetente verificado/Resend ou equivalente), WhatsApp comercial e integração oficial com template aprovado. A criação de solicitação não é prova de pagamento.
- **Sem gestão multiempresa isolada ainda:** o modelo atual de `User` não contém vínculo seguro com `ParceiroLavaRapido`. Não atribuir proprietários a empresas de maneira arbitrária nem misturar dados operacionais. Projetar relação de tenant, licenças e RBAC antes de habilitar administração multiempresa.
- **Sem vídeo definitivo:** inserir somente material real aprovado, hospedado privadamente.
- **Domínio:** fazer a validação DNS na Vercel/Registro.br; código não altera a zona DNS.

## 4. Critérios para promoção a produção

1. Rodar `npm ci`, `npm run typecheck`, `npm test`, `npm run build:app`.
2. Aplicar a migração em ambiente de QA e checar que os parceiros antigos são preservados e os novos campos funcionam.
3. Testar uma comanda de demonstração: vistoria incompleta não gera PDF; vistoria concluída gera arquivo correto; em Android/iOS, verificar compartilhamento; no desktop, anexar PDF manualmente.
4. Copiar o link em Agendamentos, conferir nome do estabelecimento e garantir que o endereço público funciona.
5. Conferir que o acesso à plataforma e aos parceiros está protegido por sessão de administrador.
6. Só publicar após validar preview e aprovar a migração, nunca executar alteração de base de produção antecipadamente.
