# Planos anuais Ducha Elitte — regras comerciais e integração financeira

## Condições do contrato (12 meses)

| Plano | Total do contrato | Pagamento | Meio |
| --- | ---: | --- | --- |
| Anual em mensalidades | R$ 960,00 | 12 mensalidades de R$ 80,00 | Cartão de débito (previsto, dependente de gateway compatível) |
| Anual à vista | R$ 790,00 | Uma única vez | Pix Inter ou cartão de crédito em **1x**, sem parcelamento |

- Desconto à vista: R$ 170,00 em comparação com o anual de R$ 960,00.
- Os 12 pagamentos mensais referem-se a um compromisso de 12 meses. A política de renovação, inadimplência, cancelamento e eventual multa deverá ser estabelecida no contrato antes de cobrar.
- Taxa inicial de implantação: somente se previamente apresentada e aceita; não é cobrada pelo cadastro.
- Somente a **plataforma** é faturada em favor da ELITTE SCOUT LTDA. Os valores recebidos pelas lavagens pertencem exclusivamente a cada estabelecimento e usam suas próprias configurações. Não redirecionar Pix dos lava-rápidos para a conta da plataforma.
- O cartão de crédito do plano de R$ 790,00 usa uma única transação de R$ 790,00, nunca 12x.

## Estado técnico

- Cadastro público apresenta as duas ofertas e restringe as formas de pagamento conforme o plano.
- O servidor valida plano + meio de pagamento e deriva o total do contrato e o número de cobranças. Não confia em preço/parcelas enviados pelo navegador.
- A solicitação salva plano, preço anual, quantidade de parcelas e forma pretendida para conferência no painel central.
- Migração é aditiva: preserva preços, formulários históricos e registros existentes. Novas solicitações não criam contas nem ativam licenças.
- **Não há checkout real, Pix gerado, cartão capturado nem assinatura cobrada.** Não afirmar que existe integração bancária ativa.

## Preparar API Pix Inter Empresas

1. Entrar no Internet Banking da conta PJ titular ELITTE SCOUT LTDA.
2. Abrir **Integrar → Nova Integração** (em algumas telas, **Soluções para sua empresa → Nova Integração**).
3. Nome sugerido: `Ducha Elitte — recebimento de assinatura anual`. Selecionar somente a conta titular do contrato.
4. Solicitar serviço **API Pix** com permissões para criar e consultar cobranças recebidas e, quando disponível, webhook de confirmação. Evitar autorizar envio de pagamentos bancários se não necessário.
5. Confirmar via autenticação do Inter; aguardar análise e o status **Novo**.
6. Em **Minhas Integrações → Ações (três pontos) → Download chave e certificado**, baixar .crt + .key e guardar ClientId e ClientSecret, que podem ser exibidos uma única vez. Após habilitar, confirmar status **Ativo**.
7. Em produção, armazenar os quatro itens privados SOMENTE em variáveis seguras de servidor/provedor de segredos. NUNCA commitar .key/.crt, divulgar o ClientSecret ou enviar credenciais por chat. Ideal usar certificado/chave com novas linhas preservadas (ou base64 codificado) e usar mTLS no servidor.
8. Construir API de geração de cobrança Pix imediata **apenas para o plano à vista R$ 790** e consultar o pagamento pelo ID transacional único (txid); cadastrar webhook verificado, reconciliar, impedir duplicatas e liberar acesso somente após liquidação confirmada.
9. Testar via sandbox, se disponível. O portal de FAQ do Inter consultado em 28/10/2026 exibiu alerta de indisponibilidade temporária do Sandbox. **Não emitir Pix real para 'teste' de interface.**

## Cartão de crédito e mensalidades

A API Pix Inter **não é uma API de checkout por cartão de crédito**. Para aceitar crédito 1x de R$ 790,00 precisa credenciar um gateway/adquirente, integrar checkout hospedado e webhook validado. Para cartão de débito com 12 cobranças, confirmar se esse gateway permite débito online recorrente; caso contrário, não habilitar a cobrança automática.

## Variáveis de recebedor existentes

Os dados bancários do Inter já foram registrados como variáveis criptografadas na Vercel Production (`PLATFORM_BILLING_BANK_CODE`, `PLATFORM_BILLING_BENEFICIARY`, `PLATFORM_BILLING_BENEFICIARY_CNPJ`, `PLATFORM_BILLING_BRANCH`, `PLATFORM_BILLING_ACCOUNT`). Não são suficientes para autenticar a API e não são expostos no frontend.

### Nomes planejados de segredos técnicos (ainda NÃO cadastrados)

`INTER_CLIENT_ID`, `INTER_CLIENT_SECRET`, `INTER_MTLS_CERT`, `INTER_MTLS_PRIVATE_KEY`. Podem ser usados em ambiente de teste quando o Inter liberar, exclusivamente server-side, sem prefixo NEXT_PUBLIC. A implementação de autenticação/geração de cobrança ficará condicionada às credenciais e testes de homologação.

## Testes locais e deploy

```bash
npm ci
npm run typecheck
npm test
npm run build:app
```

1. Conferir que R$ 960 aparece como 12 x R$ 80, apenas débito, e R$ 790 como Pix ou crédito 1x.
2. Enviar uma solicitação fictícia em ambiente de QA isolado, com e-mail de teste exclusivo.
3. Validar plano e total na área de administração e a inexistência de cobrança ou conta ativada.
4. Validar que os dados de comandas e Pix do estabelecimento permaneceram intactos.
5. Promover somente após o pipeline verde, migração aplicada e preview sem erros.

Referências oficiais: https://developers.inter.co/ e https://ajuda.inter.co/conta-digital-pessoa-juridica/como-faco-o-download-do-certificado-e-credenciais-da-minha-api
