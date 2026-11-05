/** Regras puras de reserva de mercadorias, compartilhadas entre o PDV e o estoque. */
export function quantidadeReservada(itens: ReadonlyArray<{ quantidade: number }>): number {
  return itens.reduce((total, item) => total + item.quantidade, 0);
}
export function estoqueLivre(estoque: number, itens: ReadonlyArray<{ quantidade: number }>): number {
  return estoque - quantidadeReservada(itens);
}
export function permiteEditarProdutos(status: string): boolean {
  return status === "AGUARDANDO" || status === "EM_LAVAGEM";
}
export function subtotalMercadorias(preco: number, quantidade: number): number {
  if (!Number.isFinite(preco) || preco <= 0 || !Number.isInteger(quantidade) ||
      quantidade < 1 || quantidade > 100) throw new Error("Preço ou quantidade inválida.");
  return Math.round(preco * 100) * quantidade;
}
