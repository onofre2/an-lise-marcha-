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
  // Em analise bidimensional o quadril e a medida menos confiavel: estudos
  // comparativos encontraram diferencas de cerca de 40 graus com vies
  // sistematico. Marcado no rotulo para o terapeuta ler com reserva.
  resultado.push({
    nome: 'Quadril (medida com reserva)',
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

export interface ParametrosTemporais {
  cadencia: number | null;
  duracaoCiclo: number | null;
  apoioDireito: number | null;
  apoioEsquerdo: number | null;
  simetria: number | null;
  alertaSimetria: boolean;
}

/**
 * Parametros temporais da marcha, obtidos apenas dos instantes marcados no
 * video. Nao dependem de escala espacial, ao contrario de comprimento do passo
 * e velocidade, e por isso sao mensuraveis com video de celular.
 *
 * Assimetria de tempo de apoio acima de 10 por cento e habitualmente descrita
 * como relevante na literatura de marcha patologica.
 */
export function calcularParametrosTemporais(
  tempos: Record<string, number>,
): ParametrosTemporais {
  const cd = tempos['contato_direito'];
  const se = tempos['saida_esquerdo'];
  const ce = tempos['contato_esquerdo'];
  const sd = tempos['saida_direito'];

  const vazio: ParametrosTemporais = {
    cadencia: null, duracaoCiclo: null, apoioDireito: null,
    apoioEsquerdo: null, simetria: null, alertaSimetria: false,
  };
  if ([cd, se, ce, sd].some(t => typeof t !== 'number')) return vazio;

  // Do contato direito ate a saida direita: tempo de apoio do pe direito.
  const apoioDireito = Number((sd - cd).toFixed(2));
  // Do contato esquerdo ate a saida esquerda. Quando a saida esquerda vem
  // antes do contato esquerdo, ela pertence ao passo anterior.
  const apoioEsquerdo = Number((se > ce ? se - ce : (ce - se)).toFixed(2));

  // Meio ciclo: contato de um pe ate o contato do outro.
  const meioCiclo = Math.abs(ce - cd);
  const duracaoCiclo = meioCiclo > 0 ? Number((meioCiclo * 2).toFixed(2)) : null;
  const cadencia = duracaoCiclo && duracaoCiclo > 0
    ? Number((120 / duracaoCiclo).toFixed(0))
    : null;

  const soma = apoioDireito + apoioEsquerdo;
  const simetria = soma > 0
    ? Number(((Math.abs(apoioDireito - apoioEsquerdo) / soma) * 100).toFixed(1))
    : null;

  return {
    cadencia,
    duracaoCiclo,
    apoioDireito,
    apoioEsquerdo,
    simetria,
    alertaSimetria: simetria !== null && simetria > 10,
  };
}

// Faixas de referencia dos parametros da marcha.
//
// Velocidade: 1,2 a 1,4 m/s em adultos; 0,8 m/s e o ponto de corte classico
// de risco funcional e mobilidade comunitaria reduzida.
// Cadencia: 100 a 120 passos por minuto no adulto.
// Simetria: ate 5% e assintomatica; acima de 10% indica assimetria clinica
// (indice de Robinson).
// Passo e passada: normalizados pela altura, 0,41 e 0,83 vezes a estatura,
// com margem de 10% adotada como criterio operacional deste aplicativo.

export type FaixaMarcha = 'preservado' | 'discreto' | 'alterado';

export interface MedidaMarcha {
  label: string;
  valor: number;
  unidade: string;
  referencia: string;
  classificacao: FaixaMarcha;
}

export function classificarVelocidade(v: number): FaixaMarcha {
  if (v >= 1.2) return 'preservado';
  if (v >= 0.8) return 'discreto';
  return 'alterado';
}

export function classificarCadencia(c: number): FaixaMarcha {
  if (c >= 100 && c <= 120) return 'preservado';
  if (c >= 90 && c <= 130) return 'discreto';
  return 'alterado';
}

export function classificarSimetria(s: number): FaixaMarcha {
  if (s <= 5) return 'preservado';
  if (s <= 10) return 'discreto';
  return 'alterado';
}

/** Compara a medida com o esperado para a altura, com margem de 10%. */
function classificarPorAltura(valor: number, esperado: number): FaixaMarcha {
  const desvio = Math.abs(valor - esperado) / esperado;
  if (desvio <= 0.1) return 'preservado';
  if (desvio <= 0.2) return 'discreto';
  return 'alterado';
}

/**
 * Parametros espaciais da marcha. Dependem da escala definida pelas duas
 * marcas de um metro no chao: sem ela, nao ha como converter pixel em metro.
 */
export function calcularParametrosEspaciais(
  passoPixels: number | null,
  pixelsPorMetro: number | null,
  duracaoCiclo: number | null,
  alturaCm: number | null,
): MedidaMarcha[] {
  if (!passoPixels || !pixelsPorMetro || pixelsPorMetro <= 0) return [];

  const saida: MedidaMarcha[] = [];
  const passo = Number((passoPixels / pixelsPorMetro).toFixed(2));
  const passada = Number((passo * 2).toFixed(2));

  if (alturaCm && alturaCm > 0) {
    const altura = alturaCm / 100;
    const passoEsperado = Number((altura * 0.41).toFixed(2));
    const passadaEsperada = Number((altura * 0.83).toFixed(2));

    saida.push({
      label: 'Comprimento do Passo',
      valor: passo,
      unidade: ' m',
      referencia: `esperado ${passoEsperado} m para ${alturaCm} cm`,
      classificacao: classificarPorAltura(passo, passoEsperado),
    });
    saida.push({
      label: 'Comprimento da Passada',
      valor: passada,
      unidade: ' m',
      referencia: `esperado ${passadaEsperada} m para ${alturaCm} cm`,
      classificacao: classificarPorAltura(passada, passadaEsperada),
    });
  } else {
    saida.push({
      label: 'Comprimento do Passo',
      valor: passo,
      unidade: ' m',
      referencia: '60 a 80 cm em adultos',
      classificacao: passo >= 0.6 && passo <= 0.8 ? 'preservado' : 'discreto',
    });
  }

  if (duracaoCiclo && duracaoCiclo > 0) {
    const velocidade = Number((passada / duracaoCiclo).toFixed(2));
    saida.push({
      label: 'Velocidade da Marcha',
      valor: velocidade,
      unidade: ' m/s',
      referencia: '1,2 a 1,4 m/s; abaixo de 0,8 indica risco funcional',
      classificacao: classificarVelocidade(velocidade),
    });
  }

  return saida;
}

/**
 * Distancia em pixels entre a ponta do pe nas duas fases de contato.
 * E o comprimento do passo antes da conversao pela escala.
 */
export function passoEmPixels(
  marcacoes: Record<string, Record<string, Ponto>>,
): number | null {
  const cd = marcacoes['contato_direito'];
  const ce = marcacoes['contato_esquerdo'];
  if (!cd || !ce || !cd.pe || !ce.pe) return null;
  const dx = ce.pe.x - cd.pe.x;
  const dy = ce.pe.y - cd.pe.y;
  return Number(Math.sqrt(dx * dx + dy * dy).toFixed(5));
}

/** Pixels por metro, a partir das duas marcas de um metro no chao. */
export function escalaPixelsPorMetro(
  pontos: { x: number; y: number }[] | null,
): number | null {
  if (!pontos || pontos.length < 2) return null;
  const dx = pontos[1].x - pontos[0].x;
  const dy = pontos[1].y - pontos[0].y;
  const d = Math.sqrt(dx * dx + dy * dy);
  return d > 0 ? Number(d.toFixed(5)) : null;
}
