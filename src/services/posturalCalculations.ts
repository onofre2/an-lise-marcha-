// Cálculos de desvios posturais baseados no protocolo SAPO (Duarte et al., 2005)
// Índices de simetria de tronco POTSI/ATSI adaptados de Suzuki et al. (1999)

// Limiar de alerta para alinhamentos (graus).
// Base: obliquidade de ombro em postura normal 1,9 +/- 1,4 graus (2 desvios-padrao = ~4,7)
// e limite de 5 graus adotado na medicao com escoliometro.
const LIMIAR_ALINHAMENTO = 5;

// Limiar de alerta por desnivel linear entre dois pontos homologos (cm).
// Na pratica clinica uma diferenca de 1 cm ja e relevante, mesmo quando o
// angulo correspondente fica abaixo de 5 graus (pontos proximos entre si).
const LIMIAR_DESNIVEL_CM = 1;

// Fracao da estatura entre o trago (altura da orelha) e o solo.
// Usada para converter distancia normalizada da foto em centimetros reais.
const FRACAO_TRAGO_SOLO = 0.87;

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

// Escala da foto: quantos centimetros reais equivalem a 1 unidade normalizada
// no eixo vertical. Usa o segmento trago -> tornozelo como regua conhecida.
// Retorna null quando nao ha altura cadastrada ou pontos suficientes.
function escalaCmPorUnidade(p: Pontos, alturaCm?: number | null): number | null {
  if (!alturaCm || alturaCm <= 0) return null;
  const topo = p.trago_d || p.trago_e || p.trago;
  const base = p.tornozelo_d || p.tornozelo_e || p.maleolo;
  if (!topo || !base) return null;
  const vao = Math.abs(base.y - topo.y);
  if (vao <= 0) return null;
  return (alturaCm * FRACAO_TRAGO_SOLO) / vao;
}

// Desnivel vertical entre dois pontos homologos, em centimetros.
function desnivelCm(a: Ponto, b: Ponto, escala: number | null): number | null {
  if (escala === null) return null;
  return Math.abs(a.y - b.y) * escala;
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

  return { label: 'POTSI (Simetria Posterior do Tronco)', valor: Number(potsi.toFixed(1)), unidade: '%', alerta: potsi >= 27 };
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

function calcularAnterior(p: Pontos, alturaCm?: number | null): Desajuste[] {
  const escala = escalaCmPorUnidade(p, alturaCm);
  const resultado: Desajuste[] = [];

  if (p.trago_d && p.trago_e) {
    const ang = anguloComHorizontal(p.trago_d, p.trago_e);
    const dn = desnivelCm(p.trago_d, p.trago_e, escala);
    resultado.push({ label: 'Alinhamento da Cabeça', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.acromio_d && p.acromio_e) {
    const ang = anguloComHorizontal(p.acromio_d, p.acromio_e);
    const dn = desnivelCm(p.acromio_d, p.acromio_e, escala);
    resultado.push({ label: 'Alinhamento dos Ombros', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.eias_d && p.eias_e) {
    const ang = anguloComHorizontal(p.eias_d, p.eias_e);
    const dn = desnivelCm(p.eias_d, p.eias_e, escala);
    resultado.push({ label: 'Alinhamento da Pelve (EIAS)', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }

  if (p.joelho_d && p.joelho_e) {
    const ang = anguloComHorizontal(p.joelho_d, p.joelho_e);
    const dn = desnivelCm(p.joelho_d, p.joelho_e, escala);
    resultado.push({ label: 'Alinhamento dos Joelhos', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.tornozelo_d && p.tornozelo_e) {
    const ang = anguloComHorizontal(p.tornozelo_d, p.tornozelo_e);
    const dn = desnivelCm(p.tornozelo_d, p.tornozelo_e, escala);
    resultado.push({ label: 'Alinhamento dos Tornozelos', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }

  if (p.halux_d && p.halux_e) {
    const ang = anguloComHorizontal(p.halux_d, p.halux_e);
    const dn = desnivelCm(p.halux_d, p.halux_e, escala);
    resultado.push({ label: 'Alinhamento dos Pés', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }

  const atsi = calcularATSI(p);
  if (atsi) resultado.push(atsi);

  return resultado;
}

function calcularPosterior(p: Pontos, alturaCm?: number | null): Desajuste[] {
  const escala = escalaCmPorUnidade(p, alturaCm);
  const resultado: Desajuste[] = [];

  if (p.trago_d && p.trago_e) {
    const ang = anguloComHorizontal(p.trago_d, p.trago_e);
    const dn = desnivelCm(p.trago_d, p.trago_e, escala);
    resultado.push({ label: 'Alinhamento da Cabeça', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.acromio_d && p.acromio_e) {
    const ang = anguloComHorizontal(p.acromio_d, p.acromio_e);
    const dn = desnivelCm(p.acromio_d, p.acromio_e, escala);
    resultado.push({ label: 'Alinhamento dos Ombros', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.escapula_d && p.escapula_e) {
    const ang = anguloComHorizontal(p.escapula_d, p.escapula_e);
    const dn = desnivelCm(p.escapula_d, p.escapula_e, escala);
    resultado.push({ label: 'Alinhamento das Escápulas', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.eips_d && p.eips_e) {
    const ang = anguloComHorizontal(p.eips_d, p.eips_e);
    const dn = desnivelCm(p.eips_d, p.eips_e, escala);
    resultado.push({ label: 'Alinhamento da Pelve (EIPS)', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.c7 && p.acromio_d && p.acromio_e) {
    const centroOmbros = { x: (p.acromio_d.x + p.acromio_e.x) / 2, y: (p.acromio_d.y + p.acromio_e.y) / 2 };
    const desvio = Math.abs(p.c7.x - centroOmbros.x);
    const larguraOmbros = distancia(p.acromio_d, p.acromio_e);
    const desvioRel = larguraOmbros > 0 ? (desvio / larguraOmbros) * 100 : 0;
    resultado.push({ label: 'Desvio Lateral da Coluna (C7)', valor: Number(desvioRel.toFixed(1)), unidade: '% da largura dos ombros', alerta: desvioRel >= 5 });
  }

  if (p.joelho_d && p.joelho_e) {
    const ang = anguloComHorizontal(p.joelho_d, p.joelho_e);
    const dn = desnivelCm(p.joelho_d, p.joelho_e, escala);
    resultado.push({ label: 'Alinhamento dos Joelhos', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }
  if (p.tornozelo_d && p.tornozelo_e) {
    const ang = anguloComHorizontal(p.tornozelo_d, p.tornozelo_e);
    const dn = desnivelCm(p.tornozelo_d, p.tornozelo_e, escala);
    resultado.push({ label: 'Alinhamento dos Tornozelos', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
  }

  if (p.halux_d && p.halux_e) {
    const ang = anguloComHorizontal(p.halux_d, p.halux_e);
    const dn = desnivelCm(p.halux_d, p.halux_e, escala);
    resultado.push({ label: 'Alinhamento dos Pés', valor: Number(ang.toFixed(1)), unidade: '°', alerta: ang >= LIMIAR_ALINHAMENTO || (dn !== null && dn >= LIMIAR_DESNIVEL_CM) });
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

    // Referencia de escala da propria foto: altura do acromio ao maleolo
    const alturaCorpo = Math.abs(p.maleolo.y - p.acromio.y);
    const rel = (v: number) => alturaCorpo > 0 ? Number(((v / alturaCorpo) * 100).toFixed(1)) : 0;

    const relTrago = rel(dxTrago);
    const relAcromio = rel(dxAcromio);
    const relTrocanter = rel(dxTrocanter);

    resultado.push({ label: 'Desvio da Cabeça (linha de prumo)', valor: relTrago, unidade: '% da altura', alerta: Math.abs(relTrago) >= 4 });
    resultado.push({ label: 'Desvio do Ombro (linha de prumo)', valor: relAcromio, unidade: '% da altura', alerta: Math.abs(relAcromio) >= 4 });
    resultado.push({ label: 'Desvio do Quadril (linha de prumo)', valor: relTrocanter, unidade: '% da altura', alerta: Math.abs(relTrocanter) >= 4 });

    if (p.joelho) {
      const dxJoelho = p.joelho.x - p.maleolo.x;
      const relJoelho = rel(dxJoelho);
      resultado.push({ label: 'Desvio do Joelho (linha de prumo)', valor: relJoelho, unidade: '% da altura', alerta: Math.abs(relJoelho) >= 4 });
    }
  }

  return resultado;
}

export function calcularDesajustes(vista: string, pontos: Pontos, alturaCm?: number | null): Desajuste[] {
  if (vista === 'anterior') return calcularAnterior(pontos, alturaCm);
  if (vista === 'posterior') return calcularPosterior(pontos, alturaCm);
  return calcularLateral(pontos);
}
