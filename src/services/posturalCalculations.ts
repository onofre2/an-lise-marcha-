// Cálculos de desvios posturais baseados no protocolo SAPO (Duarte et al., 2005)

interface Ponto { x: number; y: number; }
type Pontos = Record<string, Ponto>;

export interface Desajuste {
  label: string;
  valor: number;
  unidade: string;
  alerta: boolean;
}

// Distância entre dois pontos
function distancia(a: Ponto, b: Ponto): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// Ângulo de um segmento em relação à horizontal (em graus)
function anguloComHorizontal(a: Ponto, b: Ponto): number {
  const rad = Math.atan2(b.y - a.y, b.x - a.x);
  return Math.abs(rad * (180 / Math.PI));
}

// Índice de Assimetria (%): IA(m;n) = (m-n)/((m+n)/2)*100
function indiceAssimetria(m: number, n: number): number {
  if (m + n === 0) return 0;
  return ((m - n) / ((m + n) / 2)) * 100;
}

function calcularAnterior(p: Pontos): Desajuste[] {
  const resultado: Desajuste[] = [];

  if (p.trago_d && p.trago_e) {
    const ang = anguloComHorizontal(p.trago_d, p.trago_e);
    resultado.push({ label: 'Alinhamento da Cabeça', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > 3 });
  }
  if (p.acromio_d && p.acromio_e) {
    const ang = anguloComHorizontal(p.acromio_d, p.acromio_e);
    resultado.push({ label: 'Alinhamento dos Ombros', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > 3 });
  }
  if (p.eias_d && p.eias_e) {
    const ang = anguloComHorizontal(p.eias_d, p.eias_e);
    resultado.push({ label: 'Alinhamento da Pelve (EIAS)', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > 3 });
  }

  return resultado;
}

function calcularPosterior(p: Pontos): Desajuste[] {
  const resultado: Desajuste[] = [];

  if (p.trago_d && p.trago_e) {
    const ang = anguloComHorizontal(p.trago_d, p.trago_e);
    resultado.push({ label: 'Alinhamento da Cabeça', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > 3 });
  }
  if (p.acromio_d && p.acromio_e) {
    const ang = anguloComHorizontal(p.acromio_d, p.acromio_e);
    resultado.push({ label: 'Alinhamento dos Ombros', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > 3 });
  }
  if (p.eips_d && p.eips_e) {
    const ang = anguloComHorizontal(p.eips_d, p.eips_e);
    resultado.push({ label: 'Alinhamento da Pelve (EIPS)', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > 3 });
  }
  if (p.c7 && p.acromio_d && p.acromio_e) {
    const centroOmbros = { x: (p.acromio_d.x + p.acromio_e.x) / 2, y: (p.acromio_d.y + p.acromio_e.y) / 2 };
    const desvio = Math.abs(p.c7.x - centroOmbros.x);
    resultado.push({ label: 'Desvio Lateral da Coluna (C7)', valor: Number(desvio.toFixed(1)), unidade: 'px', alerta: desvio > 15 });
  }

  return resultado;
}

function calcularLateral(p: Pontos): Desajuste[] {
  const resultado: Desajuste[] = [];

  if (p.trago && p.acromio && p.trocanter && p.maleolo) {
    const dxTrago = p.trago.x - p.maleolo.x;
    const dxAcromio = p.acromio.x - p.maleolo.x;
    const dxTrocanter = p.trocanter.x - p.maleolo.x;

    resultado.push({ label: 'Desvio da Cabeça (linha de prumo)', valor: Number(dxTrago.toFixed(1)), unidade: 'px', alerta: Math.abs(dxTrago) > 20 });
    resultado.push({ label: 'Desvio do Ombro (linha de prumo)', valor: Number(dxAcromio.toFixed(1)), unidade: 'px', alerta: Math.abs(dxAcromio) > 20 });
    resultado.push({ label: 'Desvio do Quadril (linha de prumo)', valor: Number(dxTrocanter.toFixed(1)), unidade: 'px', alerta: Math.abs(dxTrocanter) > 20 });
  }

  return resultado;
}

export function calcularDesajustes(vista: string, pontos: Pontos): Desajuste[] {
  if (vista === 'anterior') return calcularAnterior(pontos);
  if (vista === 'posterior') return calcularPosterior(pontos);
  return calcularLateral(pontos);
}
