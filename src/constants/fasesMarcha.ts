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
    id: 'contato_inicial',
    nome: 'Contato Inicial',
    descricao: 'Momento em que o pe toca o solo pela primeira vez',
    referencias: {
      quadril: { min: 15, max: 25, texto: '20 graus de flexao' },
      joelho: { min: 0, max: 5, texto: 'extensao completa' },
      tornozelo: { min: -5, max: 5, texto: 'neutro' },
    },
  },
  {
    id: 'resposta_carga',
    nome: 'Resposta a Carga',
    descricao: 'Absorcao do impacto, logo apos o contato inicial',
    referencias: {
      quadril: { min: 15, max: 25, texto: '20 graus de flexao' },
      joelho: { min: 10, max: 20, texto: '15 graus de flexao' },
      tornozelo: { min: -10, max: 0, texto: 'leve flexao plantar' },
    },
  },
  {
    id: 'apoio_medio',
    nome: 'Apoio Medio',
    descricao: 'Corpo passa sobre o pe de apoio',
    referencias: {
      quadril: { min: -5, max: 10, texto: 'proximo do neutro' },
      joelho: { min: 0, max: 10, texto: 'proximo da extensao' },
      tornozelo: { min: 3, max: 10, texto: '5 graus de dorsiflexao' },
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
