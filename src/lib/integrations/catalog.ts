/**
 * Registro público e somente-leitura dos canais de distribuição do AquaFlow.
 * Um canal "base criada" NÃO equivale a aplicativo homologado ou publicado.
 * Não guarda credenciais, dados financeiros ou escolhas de banco por tenant.
 */
export type ChannelId =
  | "google_play" | "apple_store" | "mercado_pago" | "cielo"
  | "stone" | "pagbank" | "getnet" | "rede"
  | "safrapay" | "vero" | "infinitepay" | "ton";

export type ChannelCategory = "mobile" | "smartpos";
export type ChannelPhase = "BASE_CRIADA" | "AGUARDANDO_PARCEIRO" | "PLANEJADO";
export interface DistributionChannel {
  id: ChannelId;
  name: string;
  category: ChannelCategory;
  phase: ChannelPhase;
  description: string;
  dependency: string;
  documentationUrl: string | null;
}

/**
 * Informação de produto: apenas canais tecnicamente pesquisados ou planejados.
 * Nenhuma marca de SmartPOS tem SDK ou cobranças ativadas por este cadastro.
 */
export const distributionChannels: readonly DistributionChannel[] = [
  {
    id: "google_play", name: "Google Play", category: "mobile",
    phase: "BASE_CRIADA",
    description: "Projeto React Native preparado para Android. Operação nativa ainda não integrada.",
    dependency: "Login seguro, telas nativas completas, AAB assinado, conta Play Console e revisão.",
    documentationUrl: "https://play.google.com/console/",
  },
  {
    id: "apple_store", name: "Apple App Store", category: "mobile",
    phase: "BASE_CRIADA",
    description: "Projeto React Native preparado para iPhone. Operação nativa ainda não integrada.",
    dependency: "Login seguro, telas nativas completas, TestFlight, Apple Developer e revisão.",
    documentationUrl: "https://developer.apple.com/programs/",
  },
  {
    id: "mercado_pago", name: "Mercado Pago Point Smart", category: "smartpos",
    phase: "AGUARDANDO_PARCEIRO",
    description: "Estrutura Android/Kotlin criada, mas sem SDK, cobrança ou homologação.",
    dependency: "Autorização SmartApps, SDK oficial, terminal debug, testes e homologação.",
    documentationUrl: "https://www.mercadopago.com.br/developers/pt/docs/smartapps/overview",
  },
  {
    id: "cielo", name: "Cielo Smart", category: "smartpos",
    phase: "PLANEJADO",
    description: "Canal planejado para o aplicativo de atendimento e recebimento.",
    dependency: "Dev Console, SDK, API de transações, certificação e distribuição.",
    documentationUrl: "https://docs.cielo.com.br/cielo-smart/docs/cielo-store-dev-console",
  },
  {
    id: "stone", name: "Stone SmartPOS", category: "smartpos",
    phase: "PLANEJADO",
    description: "Integração Android prevista, sem pagamentos habilitados.",
    dependency: "Credenciamento de parceiro, SDK oficial, homologação e reconciliação.",
    documentationUrl: "https://sdkandroid.stone.com.br/",
  },
  {
    id: "pagbank", name: "PagBank SmartPOS", category: "smartpos",
    phase: "PLANEJADO",
    description: "Integração prevista após as primeiras certificações.",
    dependency: "Parceria, SDK autorizado e homologação por modelo.",
    documentationUrl: "https://developer.pagbank.com.br/docs/integracao-smartpos-1",
  },
  {
    id: "getnet", name: "Getnet Smart", category: "smartpos",
    phase: "PLANEJADO",
    description: "Integração prevista após a versão principal.",
    dependency: "Acesso Get Store, SDK, homologação e regras comerciais.",
    documentationUrl: "https://getstore.getnet.com.br/docs/",
  },
  {
    id: "rede", name: "Rede Smart", category: "smartpos",
    phase: "PLANEJADO",
    description: "Disponibilidade de SDK e distribuição requer validação comercial.",
    dependency: "Confirmar modelos, SDK e programa oficial para parceiros.",
    documentationUrl: null,
  },
  {
    id: "safrapay", name: "SafraPay Smart", category: "smartpos",
    phase: "PLANEJADO",
    description: "Disponibilidade de SDK e distribuição requer validação comercial.",
    dependency: "Confirmar integração oficial, homologação e modelos suportados.",
    documentationUrl: null,
  },
  {
    id: "vero", name: "Vero Smart", category: "smartpos",
    phase: "PLANEJADO",
    description: "Disponibilidade de SDK e distribuição requer validação comercial.",
    dependency: "Confirmar programa de aplicativos e SDK oficial.",
    documentationUrl: null,
  },
  {
    id: "infinitepay", name: "InfinitePay", category: "smartpos",
    phase: "PLANEJADO",
    description: "Sem publicação SmartPOS de terceiros confirmada. Não iniciar integração.",
    dependency: "Confirmação oficial de SDK e política de aplicativos externos.",
    documentationUrl: null,
  },
  {
    id: "ton", name: "Ton", category: "smartpos",
    phase: "PLANEJADO",
    description: "Sem publicação SmartPOS de terceiros confirmada. Não iniciar integração.",
    dependency: "Confirmação oficial de SDK e política de aplicativos externos.",
    documentationUrl: null,
  },
];

export function listDistributionChannels(category?: ChannelCategory): DistributionChannel[] {
  return distributionChannels.filter((channel) => !category || channel.category === category)
    .map((channel) => ({ ...channel }));
}

/** Status sempre false até existir aprovação externa e integração validada. */
export function releaseReadiness() {
  return {
    nativeApiVersion: 1,
    appStorePublished: false,
    googlePlayPublished: false,
    smartposPaymentEnabled: false,
    physicalTerminalCertified: false,
  } as const;
}
