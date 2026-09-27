// Movimentos avaliados na Amplitude de Movimento (ADM)
// Cada movimento define 3 pontos: o angulo e medido no ponto do meio (vertice)

export type ZeroClinico = 'direto' | 'extensao' | 'neutro90';

export interface Movimento {
  id: string;
  nome: string;
  pontos: { id: string; nome: string }[];
  referencia: number;
  // Onde fica o zero anatomico do movimento, que decide como o angulo marcado
  // vira amplitude: direto (ombro), a partir da extensao completa (cotovelo,
  // quadril, joelho) ou a partir do pe a 90 graus (tornozelo).
  zero: ZeroClinico;
}

export const MOVIMENTOS: Movimento[] = [
  {
    id: 'flexao_ombro',
    nome: 'Flexao de Ombro',
    pontos: [
      { id: 'quadril', nome: 'Quadril' },
      { id: 'ombro', nome: 'Ombro (vertice)' },
      { id: 'cotovelo', nome: 'Cotovelo' },
    ],
    referencia: 180,
    zero: 'direto',
  },
  {
    id: 'abducao_ombro',
    nome: 'Abducao de Ombro',
    pontos: [
      { id: 'quadril', nome: 'Quadril' },
      { id: 'ombro', nome: 'Ombro (vertice)' },
      { id: 'cotovelo', nome: 'Cotovelo' },
    ],
    referencia: 180,
    zero: 'direto',
  },
  {
    id: 'flexao_cotovelo',
    nome: 'Flexao de Cotovelo',
    pontos: [
      { id: 'ombro', nome: 'Ombro' },
      { id: 'cotovelo', nome: 'Cotovelo (vertice)' },
      { id: 'punho', nome: 'Punho' },
    ],
    referencia: 145,
    zero: 'extensao',
  },
  {
    id: 'flexao_quadril',
    nome: 'Flexao de Quadril',
    pontos: [
      { id: 'tronco', nome: 'Tronco (ombro)' },
      { id: 'quadril', nome: 'Quadril (vertice)' },
      { id: 'joelho', nome: 'Joelho' },
    ],
    referencia: 120,
    zero: 'extensao',
  },
  {
    id: 'flexao_joelho',
    nome: 'Flexao de Joelho',
    pontos: [
      { id: 'quadril', nome: 'Quadril' },
      { id: 'joelho', nome: 'Joelho (vertice)' },
      { id: 'tornozelo', nome: 'Tornozelo' },
    ],
    referencia: 135,
    zero: 'extensao',
  },
  {
    id: 'dorsiflexao_tornozelo',
    nome: 'Dorsiflexao de Tornozelo',
    pontos: [
      { id: 'joelho', nome: 'Joelho' },
      { id: 'tornozelo', nome: 'Tornozelo (vertice)' },
      { id: 'pe', nome: 'Ponta do Pe' },
    ],
    referencia: 20,
    zero: 'neutro90',
  },
];

/** Converte o angulo medido entre os segmentos na amplitude clinica do movimento. */
export function amplitudeClinica(zero: ZeroClinico, anguloGeometrico: number): number {
  if (zero === 'extensao') return Number((180 - anguloGeometrico).toFixed(1));
  if (zero === 'neutro90') return Number(Math.abs(90 - anguloGeometrico).toFixed(1));
  return Number(anguloGeometrico.toFixed(1));
}
