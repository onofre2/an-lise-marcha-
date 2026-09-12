// Calculos da avaliacao cervical por fotogrametria.
//
// Fontes:
// - Angulo craniovertebral: protocolo classico, tragus e C7 contra a horizontal.
// - Lordose cervical: protocolo SAPO, tragus e C7 com vertice no acromio.
// - Inclinacao e rotacao cervical: ConScientiae Saude (2012).
//
// Ressalva obrigatoria no relatorio: a curvatura cervical e ossea e a
// fotogrametria mede a superficie. Os valores sao aproximacao de superficie,
// validados contra goniometro, nao contra radiografia.

export interface Ponto { x: number; y: number; }
export type PontosCervicais = Record<string, Ponto>;

export interface MedidaCervical {
  label: string;
  valor: number;
  unidade: string;
}

/** Angulo entre a reta origem-alvo e a horizontal, de 0 a 90 graus. */
function anguloComHorizontal(origem: Ponto, alvo: Ponto): number {
  const dx = Math.abs(alvo.x - origem.x);
  const dy = Math.abs(alvo.y - origem.y);
  if (dx === 0) return 90;
  return Number((Math.atan2(dy, dx) * (180 / Math.PI)).toFixed(1));
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

/** Distancia perpendicular de um ponto ate a reta que passa por a e b. */
function distanciaAteReta(ponto: Ponto, a: Ponto, b: Ponto): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const denominador = Math.sqrt(dx * dx + dy * dy);
  if (denominador === 0) return 0;
  const numerador = Math.abs(dy * ponto.x - dx * ponto.y + b.x * a.y - b.y * a.x);
  return numerador / denominador;
}

/** Medidas da vista lateral: craniovertebral e lordose cervical. */
function calcularLateral(p: PontosCervicais): MedidaCervical[] {
  const saida: MedidaCervical[] = [];

  if (p.tragus && p.c7) {
    saida.push({
      label: 'Angulo Craniovertebral',
      valor: anguloComHorizontal(p.c7, p.tragus),
      unidade: '\u00b0',
    });
  }

  if (p.tragus && p.acromio && p.c7) {
    saida.push({
      label: 'Lordose Cervical',
      valor: anguloNoVertice(p.tragus, p.acromio, p.c7),
      unidade: '\u00b0',
    });
  }

  return saida;
}

/** Medidas da vista posterior: inclinacao dos dois lados e indice de rotacao. */
function calcularPosterior(p: PontosCervicais): MedidaCervical[] {
  const saida: MedidaCervical[] = [];

  if (p.c7 && p.acromioclavicular_d && p.lobo_d) {
    saida.push({
      label: 'Inclinacao Cervical Direita',
      valor: anguloNoVertice(p.acromioclavicular_d, p.c7, p.lobo_d),
      unidade: '\u00b0',
    });
  }

  if (p.c7 && p.acromioclavicular_e && p.lobo_e) {
    saida.push({
      label: 'Inclinacao Cervical Esquerda',
      valor: anguloNoVertice(p.acromioclavicular_e, p.c7, p.lobo_e),
      unidade: '\u00b0',
    });
  }

  // Indice de rotacao: criterio operacional do aplicativo, sem respaldo
  // normativo. Serve para acompanhar a evolucao do proprio paciente.
  if (p.c7 && p.acromioclavicular_d && p.acromioclavicular_e && p.tragus_d && p.tragus_e) {
    const medioAcromios: Ponto = {
      x: (p.acromioclavicular_d.x + p.acromioclavicular_e.x) / 2,
      y: (p.acromioclavicular_d.y + p.acromioclavicular_e.y) / 2,
    };
    const dD = distanciaAteReta(p.tragus_d, p.c7, medioAcromios);
    const dE = distanciaAteReta(p.tragus_e, p.c7, medioAcromios);
    const soma = dD + dE;
    if (soma > 0) {
      saida.push({
        label: 'Indice de Rotacao Cervical',
        valor: Number((((dE - dD) / soma) * 100).toFixed(1)),
        unidade: '%',
      });
    }
  }

  return saida;
}

/** Medida da vista superior: rotacao cervical. */
function calcularSuperior(p: PontosCervicais): MedidaCervical[] {
  if (!p.manubrio || !p.topo_cabeca || !p.apice_nariz) return [];
  return [{
    label: 'Rotacao Cervical',
    valor: anguloNoVertice(p.manubrio, p.topo_cabeca, p.apice_nariz),
    unidade: '\u00b0',
  }];
}

/** Fonte unica de calculo da aba cervical. A vista anterior e foto de registro. */
export function calcularCervical(vista: string, pontos: PontosCervicais): MedidaCervical[] {
  if (vista === 'lateral_direita' || vista === 'lateral_esquerda') return calcularLateral(pontos);
  if (vista === 'posterior') return calcularPosterior(pontos);
  if (vista === 'superior') return calcularSuperior(pontos);
  return [];
}
