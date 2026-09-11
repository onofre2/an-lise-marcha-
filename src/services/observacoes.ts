export interface Ponto { x: number; y: number; }
export interface Observacao { base: Ponto; ponta: Ponto; curva?: boolean; }

/**
 * As observacoes de desajuste eram gravadas como um ponto unico (circulo) e
 * passaram a ser uma seta com base e ponta. Esta funcao le os dois formatos e
 * devolve sempre base e ponta, para que nenhuma tela precise saber a origem.
 *
 * Marcacoes antigas viram uma seta horizontal apontando para a direita, com a
 * base deslocada, de modo que a ponta caia exatamente onde estava o circulo.
 */
export function normalizarObservacoes(bruto: any): Record<string, Observacao> {
  const saida: Record<string, Observacao> = {};
  if (!bruto || typeof bruto !== 'object') return saida;

  for (const [id, valor] of Object.entries(bruto as Record<string, any>)) {
    if (!valor) continue;
    if (valor.base && valor.ponta) {
      saida[id] = { base: valor.base, ponta: valor.ponta, curva: valor.curva === true };
    } else if (typeof valor.x === 'number' && typeof valor.y === 'number') {
      saida[id] = {
        base: { x: Math.max(valor.x - 0.16, 0), y: valor.y },
        ponta: { x: valor.x, y: valor.y },
      };
    }
  }
  return saida;
}

/** Converte as coordenadas normalizadas (0 a 1) para pixel de uma area. */
export function observacoesEmPixel(
  obs: Record<string, Observacao>,
  largura: number,
  altura: number,
): Record<string, Observacao> {
  const saida: Record<string, Observacao> = {};
  for (const [id, o] of Object.entries(obs)) {
    saida[id] = {
      base: { x: o.base.x * largura, y: o.base.y * altura },
      ponta: { x: o.ponta.x * largura, y: o.ponta.y * altura },
      curva: o.curva,
    };
  }
  return saida;
}
