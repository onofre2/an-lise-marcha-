// Geracao de relatorios em PDF a partir das avaliacoes salvas

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import db from './database';
import { diagramaAmplitude, diagramaAlinhamento } from './diagramaSvg';

interface Paciente {
  id: number;
  nome: string;
  idade: number | null;
  data_nascimento: string | null;
  sexo: string | null;
  diagnostico: string | null;
  conclusao_clinica: string | null;
  objetivos_terapeuticos: string | null;
}

interface Medida {
  label: string;
  valor: number;
  unidade: string;
  alerta: boolean;
}

const ESTILO = `
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0F172A; padding: 28px; }
    h1 { font-size: 22px; color: #16A34A; margin: 0 0 4px; }
    .sub { font-size: 12px; color: #64748B; margin-bottom: 22px; }
    h2 { font-size: 15px; color: #334155; border-bottom: 2px solid #22C55E; padding-bottom: 5px; margin: 24px 0 12px; }
    .info { font-size: 13px; line-height: 1.7; color: #334155; }
    .info b { color: #0F172A; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th { background: #F1F5F9; text-align: left; padding: 8px; color: #475569; font-size: 11px; }
    td { padding: 8px; border-bottom: 1px solid #E2E8F0; }
    .ok { color: #16A34A; font-weight: bold; }
    .alerta { color: #D97706; font-weight: bold; }
    .bloco { background: #F8FAFC; border-left: 3px solid #22C55E; padding: 10px 14px; margin: 10px 0; font-size: 12px; }
    .diagramas { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
    .diagrama { border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px; background: #FFFFFF; }
    .rodape { margin-top: 34px; font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 12px; }
  </style>
`;

function cabecalho(p: Paciente, titulo: string): string {
  const hoje = new Date().toLocaleDateString('pt-BR');
  return `
    <h1>${titulo}</h1>
    <div class="sub">Emitido em ${hoje}</div>
    <h2>Dados do Paciente</h2>
    <div class="info">
      <b>Nome:</b> ${p.nome}<br/>
      ${p.data_nascimento ? '<b>Nascimento:</b> ' + p.data_nascimento + '<br/>' : ''}
      ${p.sexo ? '<b>Sexo:</b> ' + p.sexo + '<br/>' : ''}
      ${p.diagnostico ? '<b>Diagnostico:</b> ' + p.diagnostico + '<br/>' : ''}
    </div>
  `;
}

function tabelaMedidas(medidas: Medida[]): string {
  if (!medidas || medidas.length === 0) return '<div class="info">Sem medidas registradas.</div>';
  const linhas = medidas.map(m => `
    <tr>
      <td>${m.label}</td>
      <td class="${m.alerta ? 'alerta' : 'ok'}">${m.valor} ${m.unidade}</td>
      <td class="${m.alerta ? 'alerta' : 'ok'}">${m.alerta ? 'Alterado' : 'Normal'}</td>
    </tr>
  `).join('');
  return `<table><tr><th>Medida</th><th>Valor</th><th>Situacao</th></tr>${linhas}</table>`;
}

// Gera diagramas visuais para as medidas expressas em graus
function diagramasMedidas(medidas: Medida[]): string {
  if (!medidas || medidas.length === 0) return '';
  const svgs = medidas
    .filter(m => m.unidade === '\u00b0')
    .map(m => '<div class="diagrama">' + diagramaAlinhamento(m.label, m.valor, 5) + '</div>')
    .join('');
  return svgs ? '<div class="diagramas">' + svgs + '</div>' : '';
}

function rodape(): string {
  return '<div class="rodape">Relatorio gerado pelo aplicativo Analise Marcha. Documento de apoio clinico, nao substitui avaliacao presencial.</div>';
}

async function gerarEcompartilhar(html: string) {
  const { uri } = await Print.printToFileAsync({ html });
  const disponivel = await Sharing.isAvailableAsync();
  if (disponivel) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatorio' });
  }
  return uri;
}

// Relatorio de uma unica avaliacao postural
export async function gerarRelatorioPostural(idAvaliacao: number) {
  const av = db.getFirstSync('SELECT * FROM avaliacoes_posturais WHERE id = ?', [idAvaliacao]) as any;
  if (!av) throw new Error('Avaliacao nao encontrada');
  const p = db.getFirstSync('SELECT * FROM pacientes WHERE id = ?', [av.id_paciente]) as Paciente;
  const medidas: Medida[] = av.medidas_json ? JSON.parse(av.medidas_json) : [];

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Relatorio de Avaliacao Postural')}
      <h2>Avaliacao ${av.vista.replace('_', ' ')} - ${av.data_avaliacao}</h2>
      ${tabelaMedidas(medidas)}
      ${diagramasMedidas(medidas)}
      ${rodape()}
    </body></html>
  `;
  return gerarEcompartilhar(html);
}

// Relatorio com o historico completo do paciente
export async function gerarRelatorioCompleto(idPaciente: number) {
  const p = db.getFirstSync('SELECT * FROM pacientes WHERE id = ?', [idPaciente]) as Paciente;
  if (!p) throw new Error('Paciente nao encontrado');

  const posturais = db.getAllSync(
    'SELECT * FROM avaliacoes_posturais WHERE id_paciente = ? ORDER BY id DESC', [idPaciente]
  ) as any[];
  const cervicais = db.getAllSync(
    'SELECT * FROM avaliacoes_cervicais WHERE id_paciente = ? ORDER BY id DESC', [idPaciente]
  ) as any[];
  const adms = db.getAllSync(
    'SELECT * FROM avaliacoes_adm WHERE id_paciente = ? ORDER BY id DESC', [idPaciente]
  ) as any[];
  const marchas = db.getAllSync(
    'SELECT * FROM avaliacoes WHERE id_paciente = ? ORDER BY id DESC', [idPaciente]
  ) as any[];

  let corpo = '';

  if (posturais.length > 0) {
    corpo += '<h2>Avaliacoes Posturais</h2>';
    posturais.forEach(av => {
      const medidas: Medida[] = av.medidas_json ? JSON.parse(av.medidas_json) : [];
      corpo += `<div class="bloco"><b>${av.vista.replace('_', ' ')}</b> - ${av.data_avaliacao}</div>`;
      corpo += tabelaMedidas(medidas);
      corpo += diagramasMedidas(medidas);
    });
  }

  if (cervicais.length > 0) {
    corpo += '<h2>Avaliacoes Cervicais</h2><table><tr><th>Data</th><th>Angulo Craniovertebral</th><th>Situacao</th></tr>';
    cervicais.forEach(av => {
      const alterado = av.angulo < 48;
      corpo += `<tr><td>${av.data_avaliacao}</td><td>${av.angulo} graus</td><td class="${alterado ? 'alerta' : 'ok'}">${alterado ? 'Cabeca anteriorizada' : 'Normal'}</td></tr>`;
    });
    corpo += '</table>';
  }

  if (adms.length > 0) {
    corpo += '<h2>Amplitude de Movimento</h2><table><tr><th>Data</th><th>Movimento</th><th>Medido</th><th>Referencia</th><th>Deficit</th></tr>';
    adms.forEach(av => {
      const deficit = Number((av.referencia - av.angulo).toFixed(1));
      corpo += `<tr><td>${av.data_avaliacao}</td><td>${av.movimento}</td><td>${av.angulo} graus</td><td>${av.referencia} graus</td><td class="${deficit > 10 ? 'alerta' : 'ok'}">${deficit} graus</td></tr>`;
    });
    corpo += '</table>';
    corpo += '<div class="diagramas">';
    adms.forEach(av => {
      corpo += '<div class="diagrama">' + diagramaAmplitude(av.movimento, av.angulo, av.referencia) + '</div>';
    });
    corpo += '</div>';
  }

  if (marchas.length > 0) {
    corpo += '<h2>Analises de Marcha</h2><table><tr><th>Data</th><th>Angulo de Captura</th></tr>';
    marchas.forEach(av => {
      corpo += `<tr><td>${av.data_avaliacao}</td><td>${av.angulo}</td></tr>`;
    });
    corpo += '</table>';
  }

  if (corpo === '') {
    corpo = '<div class="info">Nenhuma avaliacao registrada para este paciente.</div>';
  }

  let clinico = '';
  if (p.conclusao_clinica || p.objetivos_terapeuticos) {
    clinico = '<h2>Conclusao Clinica</h2>';
    if (p.conclusao_clinica) clinico += `<div class="bloco">${p.conclusao_clinica}</div>`;
    if (p.objetivos_terapeuticos) clinico += `<div class="bloco"><b>Objetivos:</b> ${p.objetivos_terapeuticos}</div>`;
  }

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Historico Completo do Paciente')}
      ${clinico}
      ${corpo}
      ${rodape()}
    </body></html>
  `;
  return gerarEcompartilhar(html);
}
