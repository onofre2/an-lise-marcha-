// Fases do ciclo da marcha e valores normativos de referencia
// Baseado em Perry J., Gait Analysis: Normal and Pathological Function
// e valores normativos de cinematica articular no plano sagital

export interface FaseMarcha {
  id: string;
  nome: string;
  descricao: string;
  referencias: {
    quadril: { min: number; max: number; texto: string };
    joelho: { min: number; max: number; texto: string };
    tornozelo: { min: number; max: number; texto: string };
  };
}

export const FASES_MARCHA: FaseMarcha[] = [
  {
    id: 'contato_direito',
    nome: 'Contato do Pe Direito',
    descricao: 'Calcanhar direito toca o solo. Inicio do ciclo.',
    referencias: {
      quadril: { min: 15, max: 25, texto: '20 graus de flexao' },
      joelho: { min: 0, max: 5, texto: 'extensao completa' },
      tornozelo: { min: -5, max: 5, texto: 'neutro' },
    },
  },
  {
    id: 'saida_esquerdo',
    nome: 'Saida do Pe Esquerdo',
    descricao: 'Ponta do pe esquerdo deixa o solo. Fim do apoio duplo.',
    referencias: {
      quadril: { min: -20, max: -5, texto: 'extensao' },
      joelho: { min: 30, max: 45, texto: '35 a 40 graus de flexao' },
      tornozelo: { min: -25, max: -10, texto: 'flexao plantar' },
    },
  },
  {
    id: 'contato_esquerdo',
    nome: 'Contato do Pe Esquerdo',
    descricao: 'Calcanhar esquerdo toca o solo. Metade do ciclo.',
    referencias: {
      quadril: { min: 15, max: 25, texto: '20 graus de flexao' },
      joelho: { min: 0, max: 5, texto: 'extensao completa' },
      tornozelo: { min: -5, max: 5, texto: 'neutro' },
    },
  },
  {
    id: 'saida_direito',
    nome: 'Saida do Pe Direito',
    descricao: 'Ponta do pe direito deixa o solo.',
    referencias: {
      quadril: { min: -20, max: -5, texto: 'extensao' },
      joelho: { min: 30, max: 45, texto: '35 a 40 graus de flexao' },
      tornozelo: { min: -25, max: -10, texto: 'flexao plantar' },
    },
  },
];

// Pontos anatomicos marcados em cada fase
export const PONTOS_FASE = [
  { id: 'tronco', nome: 'Tronco (ombro)' },
  { id: 'quadril', nome: 'Quadril (trocanter)' },
  { id: 'joelho', nome: 'Joelho' },
  { id: 'tornozelo', nome: 'Tornozelo (maleolo)' },
  { id: 'pe', nome: 'Ponta do Pe' },
];
