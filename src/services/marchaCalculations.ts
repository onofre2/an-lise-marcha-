// Calculo dos angulos articulares no plano sagital durante a marcha

import { FASES_MARCHA } from '../constants/fasesMarcha';

export interface Ponto { x: number; y: number; }
export type PontosFase = Record<string, Ponto>;

export interface ResultadoArticulacao {
  nome: string;
  valor: number;
  referencia: string;
  dentroFaixa: boolean;
}

// Angulo entre dois vetores que partem do vertice (0 a 180 graus)
function anguloEntre(a: Ponto, vertice: Ponto, c: Ponto): number {
  const v1x = a.x - vertice.x;
  const v1y = a.y - vertice.y;
  const v2x = c.x - vertice.x;
  const v2y = c.y - vertice.y;
  const produto = v1x * v2x + v1y * v2y;
  const mod1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mod2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mod1 === 0 || mod2 === 0) return 0;
  const cos = Math.max(-1, Math.min(1, produto / (mod1 * mod2)));
  return Math.acos(cos) * (180 / Math.PI);
}

/**
 * Calcula os angulos de uma fase da marcha.
 *
 * Os pontos sao gravados em coordenadas normalizadas (0 a 1) sobre a area do
 * video, para que possam ser redesenhados em qualquer tamanho de tela ou no
 * PDF. Mas angulo so e correto em coordenadas reais: como a area do video nao
 * e quadrada, o espaco normalizado distorce a geometria. Por isso a conversao
 * acontece aqui dentro, uma unica vez, e nao em cada chamada.
 */
export function calcularFase(
  faseId: string,
  pontosNormalizados: PontosFase,
  dimensoes: { largura: number; altura: number },
): ResultadoArticulacao[] {
  const fase = FASES_MARCHA.find(f => f.id === faseId);
  if (!fase) return [];

  const p: PontosFase = {};
  for (const [id, ponto] of Object.entries(pontosNormalizados)) {
    p[id] = { x: ponto.x * dimensoes.largura, y: ponto.y * dimensoes.altura };
  }

  if (!p.tronco || !p.quadril || !p.joelho || !p.tornozelo || !p.pe) return [];

  const resultado: ResultadoArticulacao[] = [];

  // Quadril: angulo entre tronco e coxa. 180 = neutro; menor que 180 = flexao
  const anguloQuadrilBruto = anguloEntre(p.tronco, p.quadril, p.joelho);
  const quadril = Number((180 - anguloQuadrilBruto).toFixed(1));
  resultado.push({
    nome: 'Quadril',
    valor: quadril,
    referencia: fase.referencias.quadril.texto,
    dentroFaixa: quadril >= fase.referencias.quadril.min && quadril <= fase.referencias.quadril.max,
  });

  // Joelho: angulo entre coxa e perna. 180 = extensao total; menor = flexao
  const anguloJoelhoBruto = anguloEntre(p.quadril, p.joelho, p.tornozelo);
  const joelho = Number((180 - anguloJoelhoBruto).toFixed(1));
  resultado.push({
    nome: 'Joelho',
    valor: joelho,
    referencia: fase.referencias.joelho.texto,
    dentroFaixa: joelho >= fase.referencias.joelho.min && joelho <= fase.referencias.joelho.max,
  });

  // Tornozelo: angulo entre perna e pe. 90 = neutro; positivo = dorsiflexao
  const anguloTornozeloBruto = anguloEntre(p.joelho, p.tornozelo, p.pe);
  const tornozelo = Number((90 - anguloTornozeloBruto).toFixed(1));
  resultado.push({
    nome: 'Tornozelo',
    valor: tornozelo,
    referencia: fase.referencias.tornozelo.texto,
    dentroFaixa: tornozelo >= fase.referencias.tornozelo.min && tornozelo <= fase.referencias.tornozelo.max,
  });

  return resultado;
}
