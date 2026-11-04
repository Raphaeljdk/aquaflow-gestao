# AquaFlow Point — integração nativa SmartApps

> Prévia técnica, **não homologada**, não utiliza o SDK oficial e **não processa pagamentos**.

## Por que um projeto separado?

O Mercado Pago restringe o uso de WebView nos SmartApps e exige integração de
pagamento com o SDK oficial. Este módulo Android usa UI nativa e não compartilha
credenciais, banco de dados ou configuração de cobranças com outros clientes.

## Requisitos externos

1. Autorização formal do time de negócios SmartApps.
2. Kit de desenvolvimento/SDK e credenciais fornecidos pelo Mercado Pago.
3. Terminal **debug** e SmartPOS Sandbox, diferentes da Point de produção.
4. Confirmar modelo exato da Point Smart 2 e minSdk exigida.
5. Fluxos de pagamento, confirmação, cancelamento, impressão e reembolso
   implementados **somente pelo SDK oficial**.
6. Registro/consulta de pagamento no backend com idempotência e reconciliação,
   vinculados à conta do estabelecimento autorizada por OAuth.
7. Testes de baixa conectividade e recebimento de retorno tardio de cobrança.
8. Homologação, assinatura do APK, distribuição controlada e aprovação pelo MP.

## Implementado nesta etapa

- Projeto Android/Kotlin independente em `apps/point-smart`;
- Manifest mínimo com Internet, sem WebView/Play Services;
- Tela inicial nativa explicitamente marcada como prévia técnica;
- Contrato `PaymentPort` com implementação desabilitada (fail closed).

Não instale APKs não homologados na maquininha produtiva nem tente habilitar
depuração, root ou sideload fora do programa oficial do Mercado Pago.

Referências:
- https://www.mercadopago.com.br/developers/pt/docs/smartapps/overview
- https://www.mercadopago.com.br/developers/pt/docs/smartapps/restrictions
- https://www.mercadopago.com.br/developers/pt/docs/smartapps/deployment
