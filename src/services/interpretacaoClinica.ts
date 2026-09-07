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
 * Angulo Q: formado no centro da patela pela interseccao de duas linhas, uma
 * vinda da espinha iliaca antero-superior e outra da tuberosidade da tibia.
 *
 * Valores de referencia usuais: cerca de 13 graus em homens e 18 em mulheres.
 * Acima de 20 graus ha maior incidencia de alteracoes femoropatelares; abaixo
 * da faixa normal, tendencia a joelho varo.
 *
 * Ressalva: o angulo Q e classicamente medido em decubito dorsal e nao ha
 * consenso universal sobre valores normais. Aqui e obtido por fotogrametria
 * em ortostatismo, o que serve de triagem, nao de medida definitiva.
 */
function classificarJoelho(
  espinha: Ponto, patela: Ponto, tuberosidade: Ponto,
  lado: 'direito' | 'esquerdo',
  sexo: string | null,
): Achado | null {
  const a1 = Math.atan2(espinha.y - patela.y, espinha.x - patela.x);
  const a2 = Math.atan2(tuberosidade.y - patela.y, tuberosidade.x - patela.x);
  let ang = Math.abs((a1 - a2) * (180 / Math.PI));
  if (ang > 180) ang = 360 - ang;
  const anguloQ = Number((180 - ang).toFixed(1));

  const feminino = (sexo || '').toLowerCase().startsWith('f');
  const referencia = feminino ? 18 : 13;
  const faixaMin = feminino ? 15 : 10;

  let descricao: string;
  let alerta = false;
  if (anguloQ > 20) {
    descricao = `Angulo Q de ${anguloQ} graus, acima da faixa esperada (referencia ${referencia} graus). Tendencia a joelho valgo.`;
    alerta = true;
  } else if (anguloQ < faixaMin) {
    descricao = `Angulo Q de ${anguloQ} graus, abaixo da faixa esperada (referencia ${referencia} graus). Tendencia a joelho varo.`;
    alerta = true;
  } else {
    descricao = `Angulo Q de ${anguloQ} graus, dentro da faixa esperada (referencia ${referencia} graus).`;
  }
  return { titulo: `Joelho ${lado}`, descricao, alerta };
}

/**
 * Gera os achados clinicos a partir dos pontos marcados. O texto e uma
 * sugestao descritiva: cabe ao terapeuta revisar, ajustar e assinar.
 */
export function gerarAchados(
  vista: string,
  pontos: Record<string, Ponto>,
  cmPorUnidade: number | null,
  sexo: string | null = null,
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

    if (p.eias_d && p.joelho_d && p.tuberosidade_d) {
      const a = classificarJoelho(p.eias_d, p.joelho_d, p.tuberosidade_d, 'direito', sexo);
      if (a) achados.push(a);
    }
    if (p.eias_e && p.joelho_e && p.tuberosidade_e) {
      const a = classificarJoelho(p.eias_e, p.joelho_e, p.tuberosidade_e, 'esquerdo', sexo);
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
