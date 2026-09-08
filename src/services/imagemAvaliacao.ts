// Reproduz no PDF a mesma imagem que o terapeuta ajustou na tela:
// foto do paciente com linhas, badges de angulo, pontos e observacoes.

import { File } from 'expo-file-system';

interface Ponto { x: number; y: number; }

interface Medida {
  label: string;
  valor: number;
  unidade: string;
  alerta: boolean;
}

interface Dimensoes { largura: number; altura: number; }

const VERDE = '#4ADE80';
const AMBAR = '#F59E0B';
const VERMELHO = '#EF4444';
const FUNDO_OK = '#DCFCE7';
const FUNDO_ALERTA = '#FEF3C7';
const TEXTO_OK = '#16A34A';
const TEXTO_ALERTA = '#D97706';

function mimeDaUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase().split('?')[0];
  if (ext === 'png') return 'image/png';
  return 'image/jpeg';
}

/** Converte a foto salva em base64 para embutir no PDF. */
export async function fotoParaBase64(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    const arquivo = new File(uri);
    if (!arquivo.exists) return null;
    const base64 = await arquivo.base64();
    return `data:${mimeDaUri(uri)};base64,${base64}`;
  } catch (e) {
    console.error('Erro ao converter foto da avaliacao:', e);
    return null;
  }
}

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Desenha uma linha entre dois pontos, colorida conforme o status. */
function linha(a: Ponto, b: Ponto, alerta: boolean): string {
  const cor = alerta ? AMBAR : VERDE;
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${cor}" stroke-width="3" stroke-linecap="round" />`;
}

/** Badge com o valor medido, posicionado sobre a linha. */
function badge(x: number, y: number, texto: string, alerta: boolean): string {
  const largura = Math.max(34, texto.length * 8);
  const fundo = alerta ? FUNDO_ALERTA : FUNDO_OK;
  const cor = alerta ? TEXTO_ALERTA : TEXTO_OK;
  return `
    <rect x="${x - largura / 2}" y="${y - 26}" width="${largura}" height="18" rx="9" fill="${fundo}" />
    <text x="${x}" y="${y - 13}" font-size="11" font-weight="bold" fill="${cor}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif">${escapar(texto)}</text>
  `;
}

/** Marcador de ponto anatomico. */
function marcador(p: Ponto): string {
  return `<circle cx="${p.x}" cy="${p.y}" r="6" fill="${VERDE}" stroke="#FFFFFF" stroke-width="2" />`;
}

/** Circulo vermelho de observacao marcado pelo terapeuta. */
function observacao(o: { base: Ponto; ponta: Ponto }): string {
  const dx = o.ponta.x - o.base.x;
  const dy = o.ponta.y - o.base.y;
  const ang = Math.atan2(dy, dx) * (180 / Math.PI);
  const rotuloX = dx > 0 ? o.base.x - 8 : o.base.x + 8;
  const ancora = dx > 0 ? 'end' : 'start';
  return `
    <line x1="${o.base.x}" y1="${o.base.y}" x2="${o.ponta.x}" y2="${o.ponta.y}" stroke="${VERMELHO}" stroke-width="1.8" />
    <polygon points="0,-3.5 8,0 0,3.5" fill="${VERMELHO}" transform="translate(${o.ponta.x},${o.ponta.y}) rotate(${ang})" />
    <text x="${rotuloX}" y="${o.base.y + 4}" fill="${VERMELHO}" font-size="9" font-weight="bold" text-anchor="${ancora}">desajuste</text>
  `;
}

export const elementos = { linha, badge, marcador, observacao };
export type { Ponto, Medida, Dimensoes };
import { normalizarObservacoes, observacoesEmPixel } from './observacoes';

// Mapeia pares de pontos para o rotulo da medida correspondente.
// Mesma logica usada na tela de resultado, para que o PDF mostre
// exatamente os mesmos badges que o terapeuta viu e ajustou.
const MAPA_LABEL: Record<string, string> = {
  'trago_d|trago_e': 'Alinhamento da Cabeça',
  'acromio_d|acromio_e': 'Alinhamento dos Ombros',
  'eias_d|eias_e': 'Alinhamento da Pelve (EIAS)',
  'eips_d|eips_e': 'Alinhamento da Pelve (EIPS)',
  'escapula_d|escapula_e': 'Alinhamento das Escápulas',
  'trocanter_d|trocanter_e': 'Alinhamento dos Trocânteres',
  'joelho_d|joelho_e': 'Alinhamento dos Joelhos',
  'halux_d|halux_e': 'Alinhamento dos Pés',
  'tornozelo_d|tornozelo_e': 'Alinhamento dos Tornozelos',
};

/**
 * Monta a imagem da avaliacao postural como SVG, com a foto ao fundo
 * e todos os elementos ajustados pelo terapeuta sobrepostos.
 */
export function imagemPostural(
  fotoBase64: string,
  pontos: Record<string, Ponto>,
  segmentos: [string, string][],
  medidas: Medida[],
  dimensoes: Dimensoes,
  observacoes: Record<string, Ponto>,
  semCor = false,
  comGrade = false,
): string {
  const { largura, altura } = dimensoes;
  let camadas = '';

  // Os pontos sao gravados normalizados (0 a 1). Converte para pixel do SVG.
  const px = (mapa: Record<string, Ponto>): Record<string, Ponto> => {
    const out: Record<string, Ponto> = {};
    for (const [id, p] of Object.entries(mapa)) {
      out[id] = { x: p.x * largura, y: p.y * altura };
    }
    return out;
  };
  const pontosPx = px(pontos);
  const observacoesPx = observacoesEmPixel(normalizarObservacoes(observacoes), largura, altura);


  segmentos.forEach(([idA, idB]) => {
    const a = pontosPx[idA];
    const b = pontosPx[idB];
    if (!a || !b) return;

    const label = MAPA_LABEL[`${idA}|${idB}`] || MAPA_LABEL[`${idB}|${idA}`];
    const medida = label ? medidas.find(m => m.label === label) : undefined;
    const alerta = medida ? medida.alerta : false;

    camadas += linha(a, b, alerta);

    if (medida) {
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      camadas += badge(mx, my, `${medida.valor}${medida.unidade}`, alerta);
    }
  });

  // Eixo ideal (vertical verde) e eixo real do tronco (vermelho).
  const tD = pontosPx.tornozelo_d;
  const tE = pontosPx.tornozelo_e;
  const maleoloPx = pontosPx.maleolo;
  const baseX = tD && tE ? (tD.x + tE.x) / 2 : maleoloPx ? maleoloPx.x : null;
  if (baseX !== null) {
    camadas += `<line x1="${baseX}" y1="0" x2="${baseX}" y2="${altura}" stroke="#22C55E" stroke-width="2" />`;
  }
  const acD = pontosPx.acromio_d;
  const acE = pontosPx.acromio_e;
  const eiD = pontosPx.eias_d || pontosPx.eips_d;
  const eiE = pontosPx.eias_e || pontosPx.eips_e;
  // A linha vermelha atravessa a imagem inteira, como a verde: so assim da
  // para ler a inclinacao e o afastamento entre o eixo real e o ideal.
  const eixoInteiro = (a: Ponto, b: Ponto) => {
    const dy = b.y - a.y;
    if (dy === 0) {
      return `<line x1="0" y1="${a.y}" x2="${largura}" y2="${a.y}" stroke="#EF4444" stroke-width="2" />`;
    }
    const inclinacao = (b.x - a.x) / dy;
    const xTopo = a.x + (0 - a.y) * inclinacao;
    const xBase = a.x + (altura - a.y) * inclinacao;
    return `<line x1="${xTopo}" y1="0" x2="${xBase}" y2="${altura}" stroke="#EF4444" stroke-width="2" />`;
  };

  if (acD && acE && eiD && eiE) {
    const topo = { x: (acD.x + acE.x) / 2, y: (acD.y + acE.y) / 2 };
    const baixo = { x: (eiD.x + eiE.x) / 2, y: (eiD.y + eiE.y) / 2 };
    camadas += eixoInteiro(topo, baixo);
  } else if (pontosPx.acromio && pontosPx.trocanter) {
    camadas += eixoInteiro(pontosPx.acromio, pontosPx.trocanter);
  }

  Object.values(pontosPx).forEach(p => { camadas += marcador(p); });
  Object.values(observacoesPx).forEach(p => { camadas += observacao(p); });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;background:#000;">
      ${semCor ? '<filter id="semCor"><feColorMatrix type="saturate" values="0"/></filter>' : ''}
      <image href="${fotoBase64}" x="0" y="0" width="${largura}" height="${altura}" preserveAspectRatio="xMidYMid meet" ${semCor ? 'filter="url(#semCor)"' : ''} />
      ${comGrade ? Array.from({ length: 11 }).map((_, i) =>
        `<line x1="${(largura / 10) * i}" y1="0" x2="${(largura / 10) * i}" y2="${altura}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`
      ).join('') + Array.from({ length: 13 }).map((_, i) =>
        `<line x1="0" y1="${(altura / 12) * i}" x2="${largura}" y2="${(altura / 12) * i}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`
      ).join('') : ''}
      ${camadas}
    </svg>
  `;
}

/**
 * Monta a imagem de uma avaliacao simples (cervical ou ADM),
 * onde as linhas ligam pontos em sequencia a partir de um vertice.
 */
export function imagemSimples(
  fotoBase64: string,
  pontos: Record<string, Ponto>,
  ligacoes: [string, string][],
  valorPrincipal: { texto: string; alerta: boolean; ancora: string } | null,
  dimensoes: Dimensoes,
  observacoes: Record<string, Ponto>,
  semCor = false,
  comGrade = false,
): string {
  const { largura, altura } = dimensoes;
  let camadas = '';

  // Os pontos sao gravados normalizados (0 a 1). Converte para pixel do SVG.
  const px = (mapa: Record<string, Ponto>): Record<string, Ponto> => {
    const out: Record<string, Ponto> = {};
    for (const [id, p] of Object.entries(mapa)) {
      out[id] = { x: p.x * largura, y: p.y * altura };
    }
    return out;
  };
  const pontosPx = px(pontos);
  const observacoesPx = observacoesEmPixel(normalizarObservacoes(observacoes), largura, altura);

  // Eixo ideal (vertical verde) e eixo real (vermelho), os mesmos da tela.
  const eixoVertical = (x: number) =>
    `<line x1="${x}" y1="0" x2="${x}" y2="${altura}" stroke="#22C55E" stroke-width="2" />`;
  const eixoInclinado = (a: Ponto, b: Ponto) => {
    const alto = a.y <= b.y ? a : b;
    const baixo = a.y <= b.y ? b : a;
    const dy = baixo.y - alto.y;
    if (dy === 0) return '';
    const inc = (baixo.x - alto.x) / dy;
    const xTopo = alto.x + (0 - alto.y) * inc;
    const xBase = alto.x + (altura - alto.y) * inc;
    return `<line x1="${xTopo}" y1="0" x2="${xBase}" y2="${altura}" stroke="${VERMELHO}" stroke-width="2" />`;
  };

  if (pontosPx.acromio && pontosPx.trago) {
    camadas += eixoVertical(pontosPx.acromio.x);
    camadas += eixoInclinado(pontosPx.acromio, pontosPx.trago);
  } else if (pontosPx.dorso_d && pontosPx.dorso_e) {
    camadas += eixoVertical((pontosPx.dorso_d.x + pontosPx.dorso_e.x) / 2);
    camadas += eixoInclinado(pontosPx.dorso_d, pontosPx.dorso_e);
  }


  ligacoes.forEach(([idA, idB]) => {
    const a = pontosPx[idA];
    const b = pontosPx[idB];
    if (!a || !b) return;
    camadas += linha(a, b, valorPrincipal ? valorPrincipal.alerta : false);
  });

  if (valorPrincipal && pontosPx[valorPrincipal.ancora]) {
    const p = pontosPx[valorPrincipal.ancora];
    camadas += badge(p.x, p.y, valorPrincipal.texto, valorPrincipal.alerta);
  }

  Object.values(pontosPx).forEach(p => { camadas += marcador(p); });
  Object.values(observacoesPx).forEach(p => { camadas += observacao(p); });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;background:#000;">
      ${semCor ? '<filter id="semCor"><feColorMatrix type="saturate" values="0"/></filter>' : ''}
      <image href="${fotoBase64}" x="0" y="0" width="${largura}" height="${altura}" preserveAspectRatio="xMidYMid meet" ${semCor ? 'filter="url(#semCor)"' : ''} />
      ${comGrade ? Array.from({ length: 11 }).map((_, i) =>
        `<line x1="${(largura / 10) * i}" y1="0" x2="${(largura / 10) * i}" y2="${altura}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`
      ).join('') + Array.from({ length: 13 }).map((_, i) =>
        `<line x1="0" y1="${(altura / 12) * i}" x2="${largura}" y2="${(altura / 12) * i}" stroke="rgba(0,0,0,0.35)" stroke-width="1" />`
      ).join('') : ''}
      ${camadas}
    </svg>
  `;
}
