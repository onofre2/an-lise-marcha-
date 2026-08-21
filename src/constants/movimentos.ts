// Movimentos avaliados na Amplitude de Movimento (ADM)
// Cada movimento define 3 pontos: o angulo e medido no ponto do meio (vertice)

export interface Movimento {
  id: string;
  nome: string;
  pontos: { id: string; nome: string }[];
  referencia: number;
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
  },
];
