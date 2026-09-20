// Calculos da avaliacao de joelhos por fotogrametria.
//
// Alinhamento frontal e sagital: angulo no vertice entre os segmentos
// proximal e distal, com o sinal do produto vetorial 2D indicando o lado
// do desvio.
//
// Angulo do retrope: protocolo de quatro marcadores em vista posterior.
// Faixas de Eng JJ, Pierrynowski MR (1994): varo abaixo de 0 graus,
// normal entre 0 e 6, valgo acima de 6. As faixas de transicao de 3 graus
// sao criterio operacional deste aplicativo.

export interface Ponto { x: number; y: number; }
export type PontosJoelho = Record<string, Ponto>;

export type FaixaJoelho = 'preservado' | 'discreto' | 'alterado';

export interface MedidaJoelho {
  label: string;
  valor: number;
  unidade: string;
  classificacao: FaixaJoelho;
  descricao: string;
}

/** Angulo formado por tres pontos, com vertice no segundo. */
function anguloNoVertice(a: Ponto, vertice: Ponto, b: Ponto): number {
  const v1x = a.x - vertice.x;
  const v1y = a.y - vertice.y;
  const v2x = b.x - vertice.x;
  const v2y = b.y - vertice.y;

  const produto = v1x * v2x + v1y * v2y;
  const mod1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mod2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mod1 === 0 || mod2 === 0) return 0;

  const cos = Math.max(-1, Math.min(1, produto / (mod1 * mod2)));
  return Number((Math.acos(cos) * (180 / Math.PI)).toFixed(1));
}

/**
 * Angulo entre duas retas, de 0 a 90 graus. Cada reta e definida por dois
 * pontos. O resultado e o desvio entre elas, nao o angulo no vertice.
 */
function anguloEntreRetas(a1: Ponto, a2: Ponto, b1: Ponto, b2: Ponto): number {
  const v1x = a2.x - a1.x;
  const v1y = a2.y - a1.y;
  const v2x = b2.x - b1.x;
  const v2y = b2.y - b1.y;

  const mod1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mod2 = Math.sqrt(v2x * v2x + v2y * v2y);
  if (mod1 === 0 || mod2 === 0) return 0;

  const cos = Math.abs(v1x * v2x + v1y * v2y) / (mod1 * mod2);
  const limitado = Math.max(-1, Math.min(1, cos));
  return Number((Math.acos(limitado) * (180 / Math.PI)).toFixed(1));
}

/** Sinal do produto vetorial entre duas retas: indica o lado do desvio. */
function sinalEntreRetas(a1: Ponto, a2: Ponto, b1: Ponto, b2: Ponto): number {
  const v1x = a2.x - a1.x;
  const v1y = a2.y - a1.y;
  const v2x = b2.x - b1.x;
  const v2y = b2.y - b1.y;
  return v1x * v2y - v1y * v2x >= 0 ? 1 : -1;
}

/** Produto vetorial 2D: o sinal indica para que lado o vertice se desvia. */
function ladoDoDesvio(a: Ponto, vertice: Ponto, b: Ponto): number {
  const v1x = vertice.x - a.x;
  const v1y = vertice.y - a.y;
  const v2x = b.x - vertice.x;
  const v2y = b.y - vertice.y;
  return v1x * v2y - v1y * v2x;
}

/** Faixas do plano frontal: valgo e varo do joelho. */
function classificarFrontal(g: number): { faixa: FaixaJoelho; descricao: string } {
  if (g < 165) return { faixa: 'alterado', descricao: 'Valgo acentuado' };
  if (g < 170) return { faixa: 'discreto', descricao: 'Tendencia a valgo' };
  if (g <= 175) return { faixa: 'preservado', descricao: 'Fisiologico' };
  if (g < 180) return { faixa: 'discreto', descricao: 'Tendencia a varo' };
  return { faixa: 'alterado', descricao: 'Varo acentuado' };
}

/** Faixas do plano sagital: flexo e recurvato do joelho. */
function classificarSagital(g: number): { faixa: FaixaJoelho; descricao: string } {
  if (g < 170) return { faixa: 'alterado', descricao: 'Flexo acentuado' };
  if (g < 175) return { faixa: 'discreto', descricao: 'Tendencia a flexo' };
  if (g <= 180) return { faixa: 'preservado', descricao: 'Neutro' };
  if (g <= 185) return { faixa: 'discreto', descricao: 'Tendencia a recurvato' };
  return { faixa: 'alterado', descricao: 'Recurvato acentuado' };
}

/** Faixas do retrope, com o sinal ja ajustado para valgo positivo. */
function classificarRetrope(g: number): { faixa: FaixaJoelho; descricao: string } {
  if (g < -3) return { faixa: 'alterado', descricao: 'Supinada acentuada' };
  if (g < 0) return { faixa: 'discreto', descricao: 'Tendencia a supinada' };
  if (g <= 6) return { faixa: 'preservado', descricao: 'Neutra' };
  if (g <= 9) return { faixa: 'discreto', descricao: 'Tendencia a pronada' };
  return { faixa: 'alterado', descricao: 'Pronada acentuada' };
}

export const EIXOS_JOELHO = { anguloNoVertice, ladoDoDesvio };
export const FAIXAS_JOELHO = { classificarFrontal, classificarSagital, classificarRetrope };

/**
 * Medidas da vista anterior: alinhamento frontal de cada joelho.
 * O vertice e a patela, entre a espinha iliaca e o maleolo do mesmo lado.
 */
function calcularAnterior(p: PontosJoelho): MedidaJoelho[] {
  const saida: MedidaJoelho[] = [];

  const lados: [string, string, string, string][] = [
    ['eias_d', 'patela_d', 'maleolo_d', 'Direito'],
    ['eias_e', 'patela_e', 'maleolo_e', 'Esquerdo'],
  ];

  for (const [idProximal, idVertice, idDistal, lado] of lados) {
    const a = p[idProximal];
    const v = p[idVertice];
    const b = p[idDistal];
    if (!a || !v || !b) continue;

    // Como na lateral, o angulo no vertice nao distingue valgo de varo:
    // o produto vetorial diz para que lado o joelho desvia. Direita e
    // esquerda sao espelhadas, entao o sinal se inverte entre elas.
    const brutoFrontal = anguloNoVertice(a, v, b);
    const desvioFrontal = Math.abs(180 - brutoFrontal);
    const sinalFrontal = ladoDoDesvio(a, v, b) >= 0 ? 1 : -1;
    const orientacaoFrontal = lado === 'Esquerdo' ? -1 : 1;
    const graus = Number((180 + desvioFrontal * sinalFrontal * orientacaoFrontal).toFixed(1));
    const { faixa, descricao } = classificarFrontal(graus);
    saida.push({
      label: `Alinhamento Frontal - Joelho ${lado}`,
      valor: graus,
      unidade: '\u00b0',
      classificacao: faixa,
      descricao,
    });
  }

  return saida;
}

/**
 * Medida da vista lateral: alinhamento sagital do joelho.
 * O vertice e o epicondilo lateral, entre o trocanter e o maleolo.
 */
function calcularLateral(p: PontosJoelho, lado: string): MedidaJoelho[] {
  if (!p.trocanter || !p.epicondilo || !p.maleolo) return [];

  // O angulo no vertice e sempre positivo: 175 graus pode ser flexo ou
  // recurvato. O produto vetorial diz para que lado o joelho projeta e
  // permite separar os dois.
  const bruto = anguloNoVertice(p.trocanter, p.epicondilo, p.maleolo);
  const desvio = Math.abs(180 - bruto);
  const sinal = ladoDoDesvio(p.trocanter, p.epicondilo, p.maleolo) >= 0 ? 1 : -1;
  // Direita e esquerda olham para lados opostos na foto, entao o sinal do
  // produto vetorial se inverte entre elas.
  const orientacao = lado === 'Esquerdo' ? -1 : 1;
  const graus = Number((180 + desvio * sinal * orientacao).toFixed(1));
  const { faixa, descricao } = classificarSagital(graus);

  return [{
    label: `Alinhamento Sagital - Joelho ${lado}`,
    valor: graus,
    unidade: '\u00b0',
    classificacao: faixa,
    descricao,
  }];
}

/**
 * Angulo do retrope de cada pe, na vista posterior.
 * A reta inferior vai da base do calcaneo a insercao do tendao; a superior,
 * do tendao na altura do maleolo ate o centro da perna. O sinal do produto
 * vetorial define valgo (pronada) ou varo (supinada).
 */
function calcularRetrope(p: PontosJoelho): MedidaJoelho[] {
  const saida: MedidaJoelho[] = [];

  const pes: [string, string, string, string, string][] = [
    ['base_d', 'insercao_d', 'tendao_d', 'perna_d', 'Direito'],
    ['base_e', 'insercao_e', 'tendao_e', 'perna_e', 'Esquerdo'],
  ];

  for (const [idBase, idInsercao, idTendao, idPerna, lado] of pes) {
    const base = p[idBase];
    const insercao = p[idInsercao];
    const tendao = p[idTendao];
    const perna = p[idPerna];
    if (!base || !insercao || !tendao || !perna) continue;

    // Reta inferior: base do calcaneo ate a insercao do tendao.
    // Reta superior: tendao na altura do maleolo ate o centro da perna.
    const desvio = anguloEntreRetas(base, insercao, tendao, perna);
    const sinal = sinalEntreRetas(base, insercao, tendao, perna);
    const graus = Number((desvio * sinal).toFixed(1));

    const { faixa, descricao } = classificarRetrope(graus);
    saida.push({
      label: `Angulo do Retrope - Pe ${lado}`,
      valor: graus,
      unidade: '\u00b0',
      classificacao: faixa,
      descricao,
    });
  }

  return saida;
}

/** Fonte unica de calculo da aba de joelhos. */
export function calcularJoelho(vista: string, pontos: PontosJoelho): MedidaJoelho[] {
  if (vista === 'anterior') return calcularAnterior(pontos);
  if (vista === 'lateral_direita') return calcularLateral(pontos, 'Direito');
  if (vista === 'lateral_esquerda') return calcularLateral(pontos, 'Esquerdo');
  if (vista === 'retrope') return calcularRetrope(pontos);
  return [];
}
