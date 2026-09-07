import { Ponto } from './observacoes';

export interface Achado {
  titulo: string;
  descricao: string;
  alerta: boolean;
}

const LIMIAR_GRAUS = 1;

/** Nome do lado mais baixo entre dois pontos homologos, na imagem. */
function ladoMaisBaixo(direito: Ponto, esquerdo: Ponto, vista: string): 'direito' | 'esquerdo' | null {
  const diff = direito.y - esquerdo.y;
  if (Math.abs(diff) < 0.001) return null;
  // Na vista posterior a imagem e espelhada: o lado direito do paciente
  // aparece a esquerda da foto. Os pontos ja sao marcados por lado anatomico,
  // entao a leitura vale para as duas vistas.
  return diff > 0 ? 'direito' : 'esquerdo';
}

function grausEntre(a: Ponto, b: Ponto): number {
  return Math.abs(Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI));
}

/**
 * Classifica o joelho pela posicao da patela em relacao a linha entre o
 * trocanter maior e o maleolo do mesmo membro. Patela medial indica valgo;
 * lateral, varo. O afastamento e convertido em centimetros quando ha altura.
 */
function classificarJoelho(
  trocanter: Ponto, patela: Ponto, maleolo: Ponto,
  lado: 'direito' | 'esquerdo',
  cmPorUnidade: number | null,
): Achado | null {
  const dx = maleolo.x - trocanter.x;
  const dy = maleolo.y - trocanter.y;
  const comprimento = Math.sqrt(dx * dx + dy * dy);
  if (comprimento === 0) return null;

  // Sinal do produto vetorial: de que lado da linha a patela caiu.
  const cruz = dx * (patela.y - trocanter.y) - dy * (patela.x - trocanter.x);
  const afastamento = Math.abs(cruz) / comprimento;

  // Na imagem, x menor e mais a esquerda. Para o membro direito do paciente,
  // que aparece a esquerda da foto na vista anterior, medial e para a direita.
  const patelaMedial = lado === 'direito' ? cruz < 0 : cruz > 0;
  const tipo = patelaMedial ? 'valgo' : 'varo';

  const cm = cmPorUnidade !== null ? afastamento * cmPorUnidade : null;
  const acentuado = cm !== null ? cm > 1 : afastamento / comprimento > 0.04;
  if (cm !== null && cm < 0.3) return null;

  const intensidade = acentuado ? 'acentuado' : 'leve';
  const medida = cm !== null ? ` (${cm.toFixed(1)} cm)` : '';
  return {
    titulo: `Joelho ${lado}`,
    descricao: `Joelho ${tipo} ${intensidade}${medida}.`,
    alerta: acentuado,
  };
}

/**
 * Gera os achados clinicos a partir dos pontos marcados. O texto e uma
 * sugestao descritiva: cabe ao terapeuta revisar, ajustar e assinar.
 */
export function gerarAchados(
  vista: string,
  pontos: Record<string, Ponto>,
  cmPorUnidade: number | null,
): Achado[] {
  const achados: Achado[] = [];
  const p = pontos;
  const ehLateral = vista.startsWith('lateral');

  if (!ehLateral) {
    if (p.trago_d && p.trago_e) {
      const g = grausEntre(p.trago_d, p.trago_e);
      const lado = ladoMaisBaixo(p.trago_d, p.trago_e, vista);
      if (g >= LIMIAR_GRAUS && lado) {
        achados.push({
          titulo: 'Cervical',
          descricao: `Inclinacao lateral da cabeca para o lado ${lado} (${g.toFixed(1)} graus).`,
          alerta: true,
        });
      }
    }

    if (p.acromio_d && p.acromio_e) {
      const g = grausEntre(p.acromio_d, p.acromio_e);
      const lado = ladoMaisBaixo(p.acromio_d, p.acromio_e, vista);
      if (g >= LIMIAR_GRAUS && lado) {
        achados.push({
          titulo: 'Cintura escapular',
          descricao: `Ombro ${lado} rebaixado (${g.toFixed(1)} graus).`,
          alerta: true,
        });
      }
    }

    const pelD = p.eias_d || p.eips_d;
    const pelE = p.eias_e || p.eips_e;
    if (pelD && pelE) {
      const g = grausEntre(pelD, pelE);
      const baixo = ladoMaisBaixo(pelD, pelE, vista);
      if (g >= LIMIAR_GRAUS && baixo) {
        const elevado = baixo === 'direito' ? 'esquerdo' : 'direito';
        achados.push({
          titulo: 'Cintura pelvica',
          descricao: `Hemipelve ${elevado} elevada (${g.toFixed(1)} graus).`,
          alerta: true,
        });
      }
    }

    if (p.trocanter_d && p.joelho_d && p.tornozelo_d) {
      const a = classificarJoelho(p.trocanter_d, p.joelho_d, p.tornozelo_d, 'direito', cmPorUnidade);
      if (a) achados.push(a);
    }
    if (p.trocanter_e && p.joelho_e && p.tornozelo_e) {
      const a = classificarJoelho(p.trocanter_e, p.joelho_e, p.tornozelo_e, 'esquerdo', cmPorUnidade);
      if (a) achados.push(a);
    }
  } else {
    if (p.eias && p.eips) {
      const g = grausEntre(p.eips, p.eias);
      const anteversao = p.eias.y > p.eips.y;
      const fora = anteversao ? g > 15 : g > 5;
      achados.push({
        titulo: 'Inclinacao pelvica',
        descricao: anteversao
          ? `Pelve em anteversao (${g.toFixed(1)} graus).`
          : `Pelve em retroversao (${g.toFixed(1)} graus).`,
        alerta: fora,
      });
    }
  }

  return achados;
}

/**
 * Reune os achados num texto corrido, pronto para revisao do terapeuta.
 */
export function montarDiagnosticoSugerido(achados: Achado[], vista: string): string {
  if (achados.length === 0) {
    return 'Nao foram identificados desvios relevantes nesta vista.';
  }
  const frases = achados.map(a => a.descricao.replace(/\.$/, ''));
  return `Avaliacao ${vista.replace('_', ' ')}: ` + frases.join('; ') + '.';
}
