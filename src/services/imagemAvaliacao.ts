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
function observacao(p: Ponto): string {
  return `<circle cx="${p.x}" cy="${p.y}" r="12" fill="none" stroke="${VERMELHO}" stroke-width="3" />`;
}

export const elementos = { linha, badge, marcador, observacao };
export type { Ponto, Medida, Dimensoes };

// Mapeia pares de pontos para o rotulo da medida correspondente.
// Mesma logica usada na tela de resultado, para que o PDF mostre
// exatamente os mesmos badges que o terapeuta viu e ajustou.
const MAPA_LABEL: Record<string, string> = {
  'trago_d|trago_e': 'Alinhamento da Cabeça',
  'acromio_d|acromio_e': 'Alinhamento dos Ombros',
  'eias_d|eias_e': 'Alinhamento da Pelve (EIAS)',
  'eips_d|eips_e': 'Alinhamento da Pelve (EIPS)',
  'joelho_d|joelho_e': 'Alinhamento dos Joelhos',
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
): string {
  const { largura, altura } = dimensoes;
  let camadas = '';

  segmentos.forEach(([idA, idB]) => {
    const a = pontos[idA];
    const b = pontos[idB];
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

  Object.values(pontos).forEach(p => { camadas += marcador(p); });
  Object.values(observacoes).forEach(p => { camadas += observacao(p); });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;background:#000;">
      <image href="${fotoBase64}" x="0" y="0" width="${largura}" height="${altura}" preserveAspectRatio="xMidYMid meet" />
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
): string {
  const { largura, altura } = dimensoes;
  let camadas = '';

  ligacoes.forEach(([idA, idB]) => {
    const a = pontos[idA];
    const b = pontos[idB];
    if (!a || !b) return;
    camadas += linha(a, b, valorPrincipal ? valorPrincipal.alerta : false);
  });

  if (valorPrincipal && pontos[valorPrincipal.ancora]) {
    const p = pontos[valorPrincipal.ancora];
    camadas += badge(p.x, p.y, valorPrincipal.texto, valorPrincipal.alerta);
  }

  Object.values(pontos).forEach(p => { camadas += marcador(p); });
  Object.values(observacoes).forEach(p => { camadas += observacao(p); });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${largura} ${altura}" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;background:#000;">
      <image href="${fotoBase64}" x="0" y="0" width="${largura}" height="${altura}" preserveAspectRatio="xMidYMid meet" />
      ${camadas}
    </svg>
  `;
}
