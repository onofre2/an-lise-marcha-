// Geracao de diagramas SVG para os relatorios em PDF.
// Desenha o arco de referencia normal e sobrepoe o valor medido do paciente.

const CINZA = '#CBD5E1';
const VERDE = '#22C55E';
const AMBAR = '#F59E0B';
const TEXTO = '#334155';

function pontoNoArco(cx: number, cy: number, raio: number, graus: number) {
  const rad = (graus - 90) * (Math.PI / 180);
  return {
    x: cx + raio * Math.cos(rad),
    y: cy + raio * Math.sin(rad),
  };
}

function arco(cx: number, cy: number, raio: number, inicio: number, fim: number, cor: string, espessura: number) {
  const p1 = pontoNoArco(cx, cy, raio, inicio);
  const p2 = pontoNoArco(cx, cy, raio, fim);
  const grande = Math.abs(fim - inicio) > 180 ? 1 : 0;
  return `<path d="M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${raio} ${raio} 0 ${grande} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}" fill="none" stroke="${cor}" stroke-width="${espessura}" stroke-linecap="round"/>`;
}

// Diagrama de amplitude: arco cinza = referencia, arco verde = medido, faixa ambar = deficit
export function diagramaAmplitude(titulo: string, medido: number, referencia: number): string {
  const w = 260;
  const h = 170;
  const cx = 60;
  const cy = 130;
  const raio = 82;

  const escala = referencia > 0 ? Math.min(1, medido / referencia) : 0;
  const anguloMedido = escala * referencia;
  const deficit = Number((referencia - medido).toFixed(1));

  const fimRef = pontoNoArco(cx, cy, raio, referencia);
  const fimMed = pontoNoArco(cx, cy, raio, anguloMedido);

  return `
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="14" font-family="Helvetica" font-size="11" font-weight="bold" fill="${TEXTO}">${titulo}</text>
    ${arco(cx, cy, raio, 0, referencia, CINZA, 9)}
    ${arco(cx, cy, raio, 0, anguloMedido, VERDE, 9)}
    <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - raio}" stroke="${CINZA}" stroke-width="2"/>
    <line x1="${cx}" y1="${cy}" x2="${fimRef.x.toFixed(1)}" y2="${fimRef.y.toFixed(1)}" stroke="${CINZA}" stroke-width="1.5" stroke-dasharray="3,3"/>
    <line x1="${cx}" y1="${cy}" x2="${fimMed.x.toFixed(1)}" y2="${fimMed.y.toFixed(1)}" stroke="${VERDE}" stroke-width="2.5"/>
    <circle cx="${cx}" cy="${cy}" r="4" fill="${TEXTO}"/>
    <text x="165" y="66" font-family="Helvetica" font-size="10" fill="${TEXTO}">Medido</text>
    <text x="165" y="82" font-family="Helvetica" font-size="17" font-weight="bold" fill="${VERDE}">${medido}&#176;</text>
    <text x="165" y="104" font-family="Helvetica" font-size="10" fill="${TEXTO}">Referencia</text>
    <text x="165" y="119" font-family="Helvetica" font-size="13" fill="${CINZA}">${referencia}&#176;</text>
    <text x="165" y="140" font-family="Helvetica" font-size="10" fill="${TEXTO}">Deficit</text>
    <text x="165" y="155" font-family="Helvetica" font-size="13" font-weight="bold" fill="${deficit > 10 ? AMBAR : VERDE}">${deficit}&#176;</text>
  </svg>`;
}

// Diagrama de alinhamento: linha horizontal de referencia e linha inclinada do paciente
export function diagramaAlinhamento(titulo: string, graus: number, limiar: number): string {
  const w = 260;
  const h = 120;
  const cx = 90;
  const cy = 62;
  const meia = 62;
  const alterado = Math.abs(graus) > limiar;
  const rad = (graus * Math.PI) / 180;
  const dx = meia * Math.cos(rad);
  const dy = meia * Math.sin(rad);

  return `
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="14" font-family="Helvetica" font-size="11" font-weight="bold" fill="${TEXTO}">${titulo}</text>
    <line x1="${cx - meia}" y1="${cy}" x2="${cx + meia}" y2="${cy}" stroke="${CINZA}" stroke-width="2" stroke-dasharray="4,4"/>
    <line x1="${(cx - dx).toFixed(1)}" y1="${(cy + dy).toFixed(1)}" x2="${(cx + dx).toFixed(1)}" y2="${(cy - dy).toFixed(1)}" stroke="${alterado ? AMBAR : VERDE}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="${(cx - dx).toFixed(1)}" cy="${(cy + dy).toFixed(1)}" r="5" fill="${alterado ? AMBAR : VERDE}"/>
    <circle cx="${(cx + dx).toFixed(1)}" cy="${(cy - dy).toFixed(1)}" r="5" fill="${alterado ? AMBAR : VERDE}"/>
    <text x="176" y="56" font-family="Helvetica" font-size="18" font-weight="bold" fill="${alterado ? AMBAR : VERDE}">${graus}&#176;</text>
    <text x="176" y="74" font-family="Helvetica" font-size="9" fill="${TEXTO}">Limite: ${limiar}&#176;</text>
    <text x="176" y="90" font-family="Helvetica" font-size="10" font-weight="bold" fill="${alterado ? AMBAR : VERDE}">${alterado ? 'Alterado' : 'Normal'}</text>
  </svg>`;
}
