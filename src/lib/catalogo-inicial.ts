// Valores de abertura provisórios solicitados pelo proprietário.
// Nenhuma linha existente é sobrescrita: o cadastro pertence ao dono da unidade.
export const catalogoInicial = [
  { id: "ducha-inicial-cera-50", nome: "Lavagem completa com cera", descricao: "Lavagem completa com aplicação de cera. Preço provisório.", preco: 50, duracaoMin: 60, ativo: true },
  { id: "ducha-inicial-secar-25", nome: "Secagem e pretinho", descricao: "Secagem e acabamento dos pneus com pretinho. Preço provisório.", preco: 25, duracaoMin: 30, ativo: true },
  { id: "ducha-inicial-premium-115", nome: "Pacote especial", descricao: "Valor de R$ 115 informado como referência. Confirmar com o dono quais serviços estão incluídos.", preco: 115, duracaoMin: 90, ativo: true },
  { id: "ducha-inicial-externa-1499", nome: "Ducha externa", descricao: "Lavagem externa rápida. Valor sugerido para confirmação pelo proprietário.", preco: 14.99, duracaoMin: 20, ativo: true },
  { id: "ducha-inicial-simples-30", nome: "Lavagem simples", descricao: "Lavagem externa e secagem. Valor estimado.", preco: 30, duracaoMin: 30, ativo: true },
  { id: "ducha-inicial-aspiracao-20", nome: "Aspiração interna", descricao: "Aspiração do interior e tapetes. Valor estimado.", preco: 20, duracaoMin: 20, ativo: true },
  { id: "ducha-inicial-enceramento-40", nome: "Enceramento", descricao: "Aplicação de cera e acabamento externo. Valor estimado.", preco: 40, duracaoMin: 40, ativo: true },
  { id: "ducha-inicial-motor-60", nome: "Lavagem de motor", descricao: "Limpeza técnica do compartimento do motor, sob avaliação. Valor estimado.", preco: 60, duracaoMin: 45, ativo: true },
  { id: "ducha-inicial-higienizacao-120", nome: "Higienização interna", descricao: "Higienização detalhada do interior. Valor estimado.", preco: 120, duracaoMin: 120, ativo: true },
  { id: "ducha-inicial-polimento-180", nome: "Polimento automotivo", descricao: "Serviço de polimento sujeito a orçamento. Valor estimado.", preco: 180, duracaoMin: 180, ativo: true },
] as const;

export function deveCriarCatalogoInicial(totalServicos: number) {
  return totalServicos === 0;
}
