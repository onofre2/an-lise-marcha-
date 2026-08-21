// Cálculos de desvios posturais baseados no protocolo SAPO (Duarte et al., 2005)
// Índices de simetria de tronco POTSI/ATSI adaptados de Suzuki et al. (1999)

// Limiar de alerta para alinhamentos (graus).
// Base: obliquidade de ombro em postura normal 1,9 +/- 1,4 graus (2 desvios-padrao = ~4,7)
// e limite de 5 graus adotado na medicao com escoliometro.
const LIMIAR_ALINHAMENTO = 5;

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

// POTSI (Posterior Trunk Symmetry Index) - adaptação de Suzuki et al. (1999)
// Soma 6 sub-índices normalizados pela largura do tronco (% ). Valor normal referido na literatura: < 27%.
function calcularPOTSI(p: Pontos): Desajuste | null {
  if (!p.c7 || !p.acromio_d || !p.acromio_e || !p.axila_d || !p.axila_e || !p.cintura_d || !p.cintura_e || !p.eips_d || !p.eips_e) {
    return null;
  }

  const larguraTronco = distancia(p.acromio_d, p.acromio_e);
  if (larguraTronco === 0) return null;

  const midlineX = (p.eips_d.x + p.eips_e.x) / 2;

  const faiC7 = Math.abs(p.c7.x - midlineX) / larguraTronco * 100;
  const faiAxila = Math.abs(Math.abs(p.axila_d.x - midlineX) - Math.abs(p.axila_e.x - midlineX)) / larguraTronco * 100;
  const faiCintura = Math.abs(Math.abs(p.cintura_d.x - midlineX) - Math.abs(p.cintura_e.x - midlineX)) / larguraTronco * 100;

  const hdiOmbro = Math.abs(p.acromio_d.y - p.acromio_e.y) / larguraTronco * 100;
  const hdiAxila = Math.abs(p.axila_d.y - p.axila_e.y) / larguraTronco * 100;
  const hdiCintura = Math.abs(p.cintura_d.y - p.cintura_e.y) / larguraTronco * 100;

  const potsi = faiC7 + faiAxila + faiCintura + hdiOmbro + hdiAxila + hdiCintura;

  return { label: 'POTSI (Simetria Posterior do Tronco)', valor: Number(potsi.toFixed(1)), unidade: '%', alerta: potsi > 27 };
}

// ATSI (Anterior Trunk Symmetry Index) - adaptação de Suzuki et al. (1999)
// Soma 4 sub-índices. Faixa normal ainda não estabelecida na literatura - exibido sem marcação de alerta.
function calcularATSI(p: Pontos): Desajuste | null {
  if (!p.mamilo_d || !p.mamilo_e || !p.umbigo || !p.acromio_d || !p.acromio_e || !p.eias_d || !p.eias_e) {
    return null;
  }

  const larguraTronco = distancia(p.acromio_d, p.acromio_e);
  if (larguraTronco === 0) return null;

  const midlineX = (p.eias_d.x + p.eias_e.x) / 2;

  const faiMamilos = Math.abs(Math.abs(p.mamilo_d.x - midlineX) - Math.abs(p.mamilo_e.x - midlineX)) / larguraTronco * 100;
  const faiUmbigo = Math.abs(p.umbigo.x - midlineX) / larguraTronco * 100;

  const hdiOmbro = Math.abs(p.acromio_d.y - p.acromio_e.y) / larguraTronco * 100;
  const hdiMamilos = Math.abs(p.mamilo_d.y - p.mamilo_e.y) / larguraTronco * 100;

  const atsi = faiMamilos + faiUmbigo + hdiOmbro + hdiMamilos;

  return { label: 'ATSI (Simetria Anterior do Tronco)', valor: Number(atsi.toFixed(1)), unidade: '%', alerta: false };
}

function calcularAnterior(p: Pontos): Desajuste[] {
  const resultado: Desajuste[] = [];

  if (p.trago_d && p.trago_e) {
    const ang = anguloComHorizontal(p.trago_d, p.trago_e);
    resultado.push({ label: 'Alinhamento da Cabeça', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > LIMIAR_ALINHAMENTO });
  }
  if (p.acromio_d && p.acromio_e) {
    const ang = anguloComHorizontal(p.acromio_d, p.acromio_e);
    resultado.push({ label: 'Alinhamento dos Ombros', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > LIMIAR_ALINHAMENTO });
  }
  if (p.eias_d && p.eias_e) {
    const ang = anguloComHorizontal(p.eias_d, p.eias_e);
    resultado.push({ label: 'Alinhamento da Pelve (EIAS)', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > LIMIAR_ALINHAMENTO });
  }

  const atsi = calcularATSI(p);
  if (atsi) resultado.push(atsi);

  return resultado;
}

function calcularPosterior(p: Pontos): Desajuste[] {
  const resultado: Desajuste[] = [];

  if (p.trago_d && p.trago_e) {
    const ang = anguloComHorizontal(p.trago_d, p.trago_e);
    resultado.push({ label: 'Alinhamento da Cabeça', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > LIMIAR_ALINHAMENTO });
  }
  if (p.acromio_d && p.acromio_e) {
    const ang = anguloComHorizontal(p.acromio_d, p.acromio_e);
    resultado.push({ label: 'Alinhamento dos Ombros', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > LIMIAR_ALINHAMENTO });
  }
  if (p.eips_d && p.eips_e) {
    const ang = anguloComHorizontal(p.eips_d, p.eips_e);
    resultado.push({ label: 'Alinhamento da Pelve (EIPS)', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang > LIMIAR_ALINHAMENTO });
  }
  if (p.c7 && p.acromio_d && p.acromio_e) {
    const centroOmbros = { x: (p.acromio_d.x + p.acromio_e.x) / 2, y: (p.acromio_d.y + p.acromio_e.y) / 2 };
    const desvio = Math.abs(p.c7.x - centroOmbros.x);
    resultado.push({ label: 'Desvio Lateral da Coluna (C7)', valor: Number(desvio.toFixed(1)), unidade: 'px', alerta: desvio > 15 });
  }

  const potsi = calcularPOTSI(p);
  if (potsi) resultado.push(potsi);

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
