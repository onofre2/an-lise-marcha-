// Geracao de relatorios em PDF a partir das avaliacoes salvas

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import db from './database';
import { diagramaAmplitude, diagramaAlinhamento } from './diagramaSvg';
import { REFERENCIA_BASE64 } from './referenciaImagem';
import { MARCA_BASE64 } from './marcaImagem';
import { fotoParaBase64, imagemPostural, imagemSimples } from './imagemAvaliacao';
import { SEGMENTOS_RAPIDA, Vista } from '../constants/posturalPoints';
import { calcularFase } from './marchaCalculations';
import { calcularDesajustes } from './posturalCalculations';
import * as FileSystem from 'expo-file-system';

interface Paciente {
  id: number;
  nome: string;
  idade: number | null;
  altura_cm?: number | null;
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
    .rodape { margin-top: 12px; font-size: 14px; color: #64748B; text-align: center; border-top: 1px solid #E2E8F0; padding-top: 16px; }
    .rodape-terapeuta { margin-top: 34px; padding-top: 16px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 11px; color: #334155; }
  </style>
`;


/**
 * Medidas da avaliacao postural. Recalcula a partir dos pontos em vez de usar
 * o valor gravado: avaliacoes antigas foram salvas com a formula anterior, que
 * devolvia angulos proximos de 180 em vez do desvio real.
 */
function medidasDaAvaliacao(av: any): Medida[] {
  try {
    const pontos = av.pontos_json ? JSON.parse(av.pontos_json) : {};
    if (Object.keys(pontos).length > 0) {
      // A altura fica na tabela de pacientes, nao na avaliacao.
      const pac = db.getFirstSync(
        'SELECT altura_cm FROM pacientes WHERE id = ?',
        [av.id_paciente]
      ) as { altura_cm: number | null } | null;
      return calcularDesajustes(av.vista, pontos, pac?.altura_cm ?? null);
    }
  } catch {
    // cai para o valor gravado
  }
  try {
    return av.medidas_json ? JSON.parse(av.medidas_json) : [];
  } catch {
    return [];
  }
}

/** Cards do diagnostico clinico sugerido, no mesmo formato da tela. */
function blocoAchados(achadosJson: string | null): string {
  let achados: any[] = [];
  try { achados = achadosJson ? JSON.parse(achadosJson) : []; } catch {}
  if (achados.length === 0) return '';
  let html = '<h2>Diagnostico Clinico Sugerido</h2>';
  achados.forEach((a: any) => {
    const cor = a.alerta ? '#F59E0B' : '#94A3B8';
    const fundo = a.alerta ? '#FFFBEB' : '#F8FAFC';
    html += `<div style="background:${fundo};border-left:4px solid ${cor};border-radius:8px;padding:10px 12px;margin-bottom:8px;">
      <div style="font-weight:bold;font-size:13px;color:#0F172A;">${a.titulo}</div>
      <div style="font-size:13px;color:#475569;">${a.descricao}</div>
    </div>`;
  });
  return html;
}
function cabecalho(p: Paciente, titulo: string): string {
  const hoje = new Date().toLocaleDateString('pt-BR');
  return `
    <h1>Exame de Biofotogrametria</h1>
    <div class="sub" style="font-size:11px;line-height:1.5;">
      Metodo de avaliacao que utiliza fotografias ou imagens digitais para medir
      angulos, distancias e o alinhamento corporal de forma precisa.
    </div>
    <div class="sub">${titulo} &middot; Emitido em ${hoje}</div>
    <h2>Dados do Paciente</h2>
    <div class="info">
      <b>Nome:</b> ${p.nome}<br/>
      ${p.data_nascimento ? '<b>Nascimento:</b> ' + p.data_nascimento + '<br/>' : ''}
      ${p.sexo ? '<b>Sexo:</b> ' + p.sexo + '<br/>' : ''}
      ${p.altura_cm ? '<b>Altura:</b> ' + p.altura_cm + ' cm<br/>' : ''}
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

function paginaReferencias(): string {
  return `
    <div style="page-break-before: always;"></div>
    <h2>Valores de Referencia</h2>
    <div class="info">
      Os parametros normativos adotados neste relatorio seguem protocolos consagrados
      na avaliacao fisioterapeutica:
    </div>
    <ul class="info" style="margin-top: 8px; padding-left: 18px; line-height: 1.6;">
      <li><b>SAPO</b> (Duarte et al., 2005) - Software para Avaliacao Postural.</li>
      <li><b>POTSI / ATSI</b> (Suzuki et al., 1999) - Indices de simetria do tronco.</li>
      <li><b>Angulo Craniovertebral</b> - posicionamento anterior da cabeca.</li>
      <li><b>Goniometria de Kendall / AAOS</b> - amplitudes articulares.</li>
      <li><b>Ciclo da Marcha de Perry</b> - angulos por fase da marcha.</li>
    </ul>
    <div class="info" style="margin-top: 10px;">
      Limite de alerta para alinhamentos: 5 graus. Desniveis lineares a partir de 1 cm
      tambem sao sinalizados quando a altura do paciente esta registrada.
      Documento de apoio clinico - nao substitui avaliacao presencial.
    </div>
  `;
}

interface ConfigTerapeuta {
  nome: string | null;
  registro: string | null;
  logo_uri: string | null;
  assinatura_uri: string | null;
}

function buscarConfigTerapeuta(): ConfigTerapeuta | null {
  try {
    return db.getFirstSync('SELECT * FROM configuracoes_terapeuta WHERE id = 1') as ConfigTerapeuta | null;
  } catch {
    return null;
  }
}

function mimeDaUri(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

async function uriParaBase64(uri: string | null): Promise<string | null> {
  if (!uri) return null;
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    return `data:${mimeDaUri(uri)};base64,${base64}`;
  } catch (e) {
    console.error('Erro ao converter imagem para base64:', e);
    return null;
  }
}

async function rodapeCompleto(): Promise<string> {
  const config = buscarConfigTerapeuta();
  const logoBase64 = config ? await uriParaBase64(config.logo_uri) : null;
  const assinaturaBase64 = config ? await uriParaBase64(config.assinatura_uri) : null;

  let terapeutaHtml = '';
  if (config && (config.nome || logoBase64 || assinaturaBase64)) {
    terapeutaHtml = `
      <div class="rodape-terapeuta">
        ${logoBase64 ? `<img src="${logoBase64}" style="height:40px;margin-bottom:6px;" />` : ''}
        ${config.nome ? `<div><b>${config.nome}</b></div>` : ''}
        ${config.registro ? `<div>${config.registro}</div>` : ''}
        ${assinaturaBase64 ? `<img src="${assinaturaBase64}" style="height:28px;margin-top:6px;" />` : ''}
      </div>
    `;
  }

  return `
    <div style="margin-top:26px;padding-top:12px;border-top:1px solid #E2E8F0;font-size:9px;color:#94A3B8;line-height:1.5;text-align:justify;">
      <b>Referencias cientificas.</b>
      Protocolo SAPO (Duarte et al., 2005), base do modulo de avaliacao postural.
      Indices de simetria de tronco POTSI e ATSI (Suzuki et al., 1999).
      Angulo craniovertebral, padrao clinico para avaliacao de cabeca anteriorizada.
      Angulo Q, formado no centro da patela entre a linha vinda da espinha iliaca
      antero-superior e a linha vinda da tuberosidade da tibia, com referencia usual
      de cerca de 13 graus em homens e 18 em mulheres; acima de 20 graus ha maior
      incidencia de alteracoes femoropatelares. Inclinacao pelvica medida pelo angulo
      entre as espinhas iliacas antero e postero-superior em relacao a horizontal,
      com faixa usualmente descrita entre 10 e 15 graus de anteversao. Goniometria
      clinica com valores normativos de amplitude de movimento (AAOS e Kendall).
      Teste de Adams: a gibosidade e a proeminencia rotacional do lado convexo da
      curva; estudos de rastreamento escolar indicam exame radiologico acima de
      5 mm, e com escoliometro considera-se positiva a assimetria igual ou maior
      que 7 graus (indice de massa corporal abaixo do percentil 85) ou 5 graus
      (percentil 85 ou acima); a graduacao em leve, moderada e acentuada e
      operacional deste aplicativo. O teste e de triagem: a confirmacao e a
      medida do angulo de Cobb dependem de radiografia. Na vista posterior o
      desnivel entre os lados e convertido para centimetros a partir da altura do
      paciente.
      Fases do ciclo da marcha segundo Perry, J., Gait Analysis: Normal and
      Pathological Function, avaliadas apenas no plano sagital.
      Limite de alerta para alinhamentos: 5 graus; desniveis lineares a partir de
      1 cm tambem sao sinalizados quando ha altura do paciente registrada.
      As medidas obtidas por fotogrametria em ortostatismo servem como triagem e
      nao substituem exame de imagem nem medida instrumental.
    </div>
    ${terapeutaHtml}
    <div class="rodape">
      <img src="${MARCA_BASE64}" style="height:44px;vertical-align:middle;margin-right:10px;border-radius:8px;" />
      Postural Global &middot; @fisionofre &mdash; Documento de apoio clinico, nao substitui avaliacao presencial.
    </div>
  `;
}

async function gerarEcompartilhar(html: string) {
  const { uri } = await Print.printToFileAsync({ html });
  const disponivel = await Sharing.isAvailableAsync();
  if (disponivel) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Compartilhar relatorio' });
  }
  return uri;
}

// Monta a imagem da avaliacao postural com todos os elementos ajustados pelo terapeuta
async function montarImagemPostural(av: any): Promise<string> {
  try {
    const fotoBase64 = await fotoParaBase64(av.foto_uri);
    if (!fotoBase64) return '';

    const pontos = av.pontos_json ? JSON.parse(av.pontos_json) : {};
    const medidas = medidasDaAvaliacao(av);
    const observacoes = av.observacoes_json ? JSON.parse(av.observacoes_json) : {};
    const dimensoes = av.dimensoes_json
      ? JSON.parse(av.dimensoes_json)
      : { largura: 343, altura: 400 };

    const segmentos = SEGMENTOS_RAPIDA[av.vista as Vista] || [];
    return imagemPostural(fotoBase64, pontos, segmentos, medidas, dimensoes, observacoes, av.sem_cor === 1, av.com_grade === 1);
  } catch (e) {
    console.error('Erro ao montar imagem da avaliacao:', e);
    return '';
  }
}

// Monta a imagem de uma avaliacao cervical
async function montarImagemCervical(av: any): Promise<string> {
  try {
    const fotoBase64 = await fotoParaBase64(av.foto_uri);
    if (!fotoBase64) return '';

    const pontos = av.pontos_json ? JSON.parse(av.pontos_json) : {};
    const observacoes = av.observacoes_json ? JSON.parse(av.observacoes_json) : {};
    const dimensoes = av.dimensoes_json ? JSON.parse(av.dimensoes_json) : { largura: 343, altura: 400 };

    const alerta = av.angulo < 48;
    const ligacoes: [string, string][] = [['c7', 'trago'], ['acromio', 'c7']];
    const valor = { texto: `${av.angulo}\u00b0`, alerta, ancora: 'trago' };

    return imagemSimples(fotoBase64, pontos, ligacoes, valor, dimensoes, observacoes, av.sem_cor === 1, av.com_grade === 1);
  } catch (e) {
    console.error('Erro ao montar imagem cervical:', e);
    return '';
  }
}

// Monta a imagem de uma avaliacao de amplitude de movimento
async function montarImagemADM(av: any): Promise<string> {
  try {
    const fotoBase64 = await fotoParaBase64(av.foto_uri);
    if (!fotoBase64) return '';

    const pontos = av.pontos_json ? JSON.parse(av.pontos_json) : {};
    const observacoes = av.observacoes_json ? JSON.parse(av.observacoes_json) : {};
    const dimensoes = av.dimensoes_json ? JSON.parse(av.dimensoes_json) : { largura: 343, altura: 400 };

    const ids = Object.keys(pontos);
    if (ids.length < 3) return '';

    const deficit = Number((av.referencia - av.angulo).toFixed(1));
    const alerta = deficit >= 10;
    const ligacoes: [string, string][] = [[ids[1], ids[0]], [ids[1], ids[2]]];
    const valor = { texto: `${av.angulo}\u00b0`, alerta, ancora: ids[1] };

    return imagemSimples(fotoBase64, pontos, ligacoes, valor, dimensoes, observacoes, av.sem_cor === 1, av.com_grade === 1);
  } catch (e) {
    console.error('Erro ao montar imagem ADM:', e);
    return '';
  }
}

// Monta as imagens das fases da marcha capturadas durante a marcacao
// Dimensoes de referencia da area de video onde os pontos da marcha foram
// marcados. Usadas para converter as coordenadas normalizadas de volta.
// Dimensoes da area onde os pontos foram marcados, gravadas junto com a
// avaliacao. Avaliacoes antigas nao tem esse dado: nesse caso usamos o
// tamanho padrao vigente na epoca, que e melhor que nao calcular nada.
function dimensoesDaAvaliacao(registro: any): { largura: number; altura: number } {
  try {
    if (registro?.dimensoes_json) {
      const d = JSON.parse(registro.dimensoes_json);
      if (d?.largura > 0 && d?.altura > 0) return d;
    }
  } catch {}
  return { largura: 343, altura: 320 };
}

async function montarImagensMarcha(av: any): Promise<string> {
  try {
    if (!av.frames_json) return '';
    const frames = JSON.parse(av.frames_json) as Record<string, string>;
    const nomes: Record<string, string> = {
      contato_inicial: 'Contato Inicial',
      resposta_carga: 'Resposta a Carga',
      apoio_medio: 'Apoio Medio',
    };

    // As marcacoes sao gravadas em coordenadas normalizadas (0 a 1) sobre a
    // area do video. Desenhamos por cima do frame extraido do proprio arquivo.
    let marcacoes: Record<string, Record<string, { x: number; y: number }>> = {};
    try { marcacoes = av.marcacoes_json ? JSON.parse(av.marcacoes_json) : {}; } catch {}
    let observacoes: Record<string, Record<string, { x: number; y: number }>> = {};
    try { observacoes = av.observacoes_json ? JSON.parse(av.observacoes_json) : {}; } catch {}
    const CADEIA = ['tronco', 'quadril', 'joelho', 'tornozelo', 'pe'];

    let html = '';
    for (const [faseId, uri] of Object.entries(frames)) {
      const base64 = await fotoParaBase64(uri);
      if (!base64) continue;
      const pts = marcacoes[faseId] || {};
      let camadas = '';
      for (let i = 0; i < CADEIA.length - 1; i++) {
        const a = pts[CADEIA[i]];
        const b = pts[CADEIA[i + 1]];
        if (!a || !b) continue;
        camadas += `<line x1="${a.x * 100}%" y1="${a.y * 100}%" x2="${b.x * 100}%" y2="${b.y * 100}%" stroke="#22C55E" stroke-width="2" />`;
      }
      for (const id of CADEIA) {
        const pt = pts[id];
        if (!pt) continue;
        camadas += `<circle cx="${pt.x * 100}%" cy="${pt.y * 100}%" r="6" fill="none" stroke="#22C55E" stroke-width="2.5" />`;
      }
      for (const pt of Object.values(observacoes[faseId] || {})) {
        camadas += `<circle cx="${pt.x * 100}%" cy="${pt.y * 100}%" r="14" fill="none" stroke="#EF4444" stroke-width="2.5" />`;
      }
      html += `
        <div style="margin-top:12px;">
          <div class="bloco"><b>${nomes[faseId] || faseId}</b></div>
          <div style="position:relative;width:100%;">
            <img src="${base64}" style="width:100%;border:1px solid #E2E8F0;border-radius:8px;display:block;" />
            <svg style="position:absolute;top:0;left:0;width:100%;height:100%;" xmlns="http://www.w3.org/2000/svg">${camadas}</svg>
          </div>
        </div>
      `;
    }
    return html;
  } catch (e) {
    console.error('Erro ao montar imagens da marcha:', e);
    return '';
  }
}

// Relatorio de uma unica avaliacao postural
export async function gerarRelatorioPostural(idAvaliacao: number) {
  const av = db.getFirstSync('SELECT * FROM avaliacoes_posturais WHERE id = ?', [idAvaliacao]) as any;
  if (!av) throw new Error('Avaliacao nao encontrada');
  const p = db.getFirstSync('SELECT * FROM pacientes WHERE id = ?', [av.id_paciente]) as Paciente;
  const medidas: Medida[] = medidasDaAvaliacao(av);
  const rodapeHtml = await rodapeCompleto();
  const imagemHtml = await montarImagemPostural(av);

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Relatorio de Avaliacao Postural')}
      ${blocoAchados(av.achados_json)}
      <h2>Avaliacao ${av.vista.replace('_', ' ')} - ${av.data_avaliacao}</h2>
      ${imagemHtml}
      ${tabelaMedidas(medidas)}
      ${diagramasMedidas(medidas)}
      ${rodapeHtml}
    </body></html>
  `;
  return gerarEcompartilhar(html);
}

// Relatorio de uma unica avaliacao cervical
export async function gerarRelatorioCervical(idAvaliacao: number) {
  const av = db.getFirstSync('SELECT * FROM avaliacoes_cervicais WHERE id = ?', [idAvaliacao]) as any;
  if (!av) throw new Error('Avaliacao nao encontrada');
  const p = db.getFirstSync('SELECT * FROM pacientes WHERE id = ?', [av.id_paciente]) as Paciente;

  const rodapeHtml = await rodapeCompleto();
  const imagemHtml = await montarImagemCervical(av);
  const alterado = av.angulo < 48;

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Relatorio de Avaliacao Cervical')}
      ${blocoAchados(av.achados_json)}
      <h2>Angulo Craniovertebral - ${av.data_avaliacao}</h2>
      ${imagemHtml}
      <table>
        <tr><th>Medida</th><th>Valor</th><th>Situacao</th></tr>
        <tr>
          <td>Angulo Craniovertebral</td>
          <td class="${alterado ? 'alerta' : 'ok'}">${av.angulo} graus</td>
          <td class="${alterado ? 'alerta' : 'ok'}">${alterado ? 'Cabeca anteriorizada' : 'Normal'}</td>
        </tr>
      </table>
      <div class="bloco">Referencia: angulo craniovertebral normal a partir de 48 graus. Valores menores indicam anteriorizacao da cabeca.</div>
      ${rodapeHtml}
    </body></html>
  `;
  return gerarEcompartilhar(html);
}

// Relatorio de uma unica avaliacao de amplitude de movimento
export async function gerarRelatorioADM(idAvaliacao: number) {
  const av = db.getFirstSync('SELECT * FROM avaliacoes_adm WHERE id = ?', [idAvaliacao]) as any;
  if (!av) throw new Error('Avaliacao nao encontrada');
  const p = db.getFirstSync('SELECT * FROM pacientes WHERE id = ?', [av.id_paciente]) as Paciente;

  const rodapeHtml = await rodapeCompleto();
  const imagemHtml = await montarImagemADM(av);
  const deficit = Number((av.referencia - av.angulo).toFixed(1));
  const alerta = deficit >= 10;

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Relatorio de Amplitude de Movimento')}
      <h2>${av.movimento} - ${av.data_avaliacao}</h2>
      ${imagemHtml}
      <table>
        <tr><th>Medida</th><th>Valor</th></tr>
        <tr><td>Amplitude medida</td><td>${av.angulo} graus</td></tr>
        <tr><td>Referencia normal</td><td>${av.referencia} graus</td></tr>
        <tr><td>Deficit</td><td class="${alerta ? 'alerta' : 'ok'}">${deficit} graus</td></tr>
      </table>
      <div class="diagramas">
        <div class="diagrama">${diagramaAmplitude(av.movimento, av.angulo, av.referencia)}</div>
      </div>
      ${rodapeHtml}
    </body></html>
  `;
  return gerarEcompartilhar(html);
}

// Relatorio de uma unica analise de marcha
export async function gerarRelatorioMarcha(idAvaliacao: number) {
  const av = db.getFirstSync('SELECT * FROM avaliacoes WHERE id = ?', [idAvaliacao]) as any;
  if (!av) throw new Error('Avaliacao nao encontrada');
  const p = db.getFirstSync('SELECT * FROM pacientes WHERE id = ?', [av.id_paciente]) as Paciente;

  const rodapeHtml = await rodapeCompleto();
  const imagensHtml = await montarImagensMarcha(av);

  let tabelaFases = '';
  if (av.marcacoes_json) {
    try {
      const marcacoes = JSON.parse(av.marcacoes_json);
      const nomes: Record<string, string> = {
        contato_inicial: 'Contato Inicial',
        resposta_carga: 'Resposta a Carga',
        apoio_medio: 'Apoio Medio',
      };
      for (const faseId of Object.keys(marcacoes)) {
        const resultados = calcularFase(faseId, marcacoes[faseId] || {}, dimensoesDaAvaliacao(av));
        if (resultados.length === 0) continue;
        tabelaFases += `<div class="bloco"><b>${nomes[faseId] || faseId}</b></div>`;
        tabelaFases += '<table><tr><th>Articulacao</th><th>Medido</th><th>Esperado</th><th>Situacao</th></tr>';
        resultados.forEach(r => {
          tabelaFases += `<tr><td>${r.nome}</td><td>${r.valor} graus</td><td>${r.referencia}</td><td class="${r.dentroFaixa ? 'ok' : 'alerta'}">${r.dentroFaixa ? 'Normal' : 'Fora da faixa'}</td></tr>`;
        });
        tabelaFases += '</table>';
      }
    } catch (e) {
      console.error('Erro ao montar tabela de fases:', e);
    }
  }

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Relatorio de Analise de Marcha')}
      <h2>Captura ${av.angulo} - ${av.data_avaliacao}</h2>
      ${imagensHtml}
      ${tabelaFases || '<div class="info">Sem marcacoes por fase registradas nesta avaliacao.</div>'}
      ${(() => {
        try {
          const pis = av.pisada_json ? JSON.parse(av.pisada_json) : {};
          const linhas = [
            ['Pe direito', pis.pisada_direito, pis.arco_direito],
            ['Pe esquerdo', pis.pisada_esquerdo, pis.arco_esquerdo],
          ].filter(l => l[1] || l[2]);
          if (linhas.length === 0) return '';
          let html = '<h2>Caracteristicas do Pe</h2><table><tr><th>Lado</th><th>Pisada</th><th>Arco</th></tr>';
          linhas.forEach(l => {
            html += `<tr><td>${l[0]}</td><td>${l[1] || '-'}</td><td>${l[2] || '-'}</td></tr>`;
          });
          return html + '</table>';
        } catch { return ''; }
      })()}
      ${rodapeHtml}
    </body></html>
  `;
  return gerarEcompartilhar(html);
}

// Monta a imagem do teste de inclinacao de Adams
async function montarImagemAdams(av: any): Promise<string> {
  try {
    const fotoBase64 = await fotoParaBase64(av.foto_uri);
    if (!fotoBase64) return '';

    const pontos = av.pontos_json ? JSON.parse(av.pontos_json) : {};
    const observacoes = av.observacoes_json ? JSON.parse(av.observacoes_json) : {};
    const dimensoes = av.dimensoes_json ? JSON.parse(av.dimensoes_json) : { largura: 343, altura: 400 };

    const alerta = av.angulo >= 5;
    const ligacoes: [string, string][] = [['dorso_d', 'dorso_e']];
    const valor = { texto: `${av.angulo}\u00b0`, alerta, ancora: 'dorso_d' };

    return imagemSimples(fotoBase64, pontos, ligacoes, valor, dimensoes, observacoes, av.sem_cor === 1, av.com_grade === 1);
  } catch (e) {
    console.error('Erro ao montar imagem do teste de Adams:', e);
    return '';
  }
}

// Relatorio de um teste de inclinacao de Adams
export async function gerarRelatorioAdams(idAvaliacao: number) {
  const av = db.getFirstSync('SELECT * FROM avaliacoes_adams WHERE id = ?', [idAvaliacao]) as any;
  if (!av) throw new Error('Avaliacao nao encontrada');
  const p = db.getFirstSync('SELECT * FROM pacientes WHERE id = ?', [av.id_paciente]) as Paciente;

  const rodapeHtml = await rodapeCompleto();
  const imagemHtml = await montarImagemAdams(av);
  const alerta = av.angulo >= 5;

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Teste de Inclinacao de Adams')}
      ${blocoAchados(av.achados_json)}
      <h2>Triagem de assimetria - ${av.data_avaliacao}</h2>
      ${imagemHtml}
      <table>
        <tr><th>Medida</th><th>Valor</th><th>Situacao</th></tr>
        <tr>
          <td>Inclinacao entre os lados do dorso</td>
          <td class="${alerta ? 'alerta' : 'ok'}">${av.angulo} graus</td>
          <td class="${alerta ? 'alerta' : 'ok'}">${alerta ? 'Assimetria observada' : 'Sem assimetria significativa'}</td>
        </tr>
        <tr><td>Lado mais elevado</td><td colspan="2">${av.lado_elevado || '-'}</td></tr>
      </table>
      <div class="bloco">
        Este teste e uma triagem visual de assimetria do tronco realizada por fotografia.
        Nao substitui a medicao com escoliometro nem exame de imagem. Valores a partir de 5 graus
        sugerem avaliacao clinica complementar.
      </div>
      ${rodapeHtml}
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
  const adamses = db.getAllSync(
    'SELECT * FROM avaliacoes_adams WHERE id_paciente = ? ORDER BY id DESC', [idPaciente]
  ) as any[];

  let corpo = '';

  if (posturais.length > 0) {
    corpo += '<h2>Avaliacoes Posturais</h2>';
    for (const av of posturais) {
      const medidas: Medida[] = medidasDaAvaliacao(av);
      corpo += `<div class="bloco"><b>${av.vista.replace('_', ' ')}</b> - ${av.data_avaliacao}</div>`;
      corpo += await montarImagemPostural(av);
      corpo += tabelaMedidas(medidas);
      corpo += diagramasMedidas(medidas);
    }
  }

  if (cervicais.length > 0) {
    corpo += '<h2>Avaliacoes Cervicais</h2><table><tr><th>Data</th><th>Angulo Craniovertebral</th><th>Situacao</th></tr>';
    cervicais.forEach(av => {
      const alterado = av.angulo < 48;
      corpo += `<tr><td>${av.data_avaliacao}</td><td>${av.angulo} graus</td><td class="${alterado ? 'alerta' : 'ok'}">${alterado ? 'Cabeca anteriorizada' : 'Normal'}</td></tr>`;
    });
    corpo += '</table>';
    for (const av of cervicais) {
      corpo += await montarImagemCervical(av);
    }
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
    for (const av of adms) {
      corpo += await montarImagemADM(av);
    }
  }

  if (adamses.length > 0) {
    corpo += '<h2>Teste de Inclinacao de Adams</h2><table><tr><th>Data</th><th>Inclinacao</th><th>Lado elevado</th><th>Situacao</th></tr>';
    adamses.forEach(av => {
      const alterado = av.angulo >= 5;
      corpo += `<tr><td>${av.data_avaliacao}</td><td>${av.angulo} graus</td><td>${av.lado_elevado || '-'}</td><td class="${alterado ? 'alerta' : 'ok'}">${alterado ? 'Assimetria observada' : 'Sem assimetria significativa'}</td></tr>`;
    });
    corpo += '</table>';
    for (const av of adamses) {
      corpo += await montarImagemAdams(av);
    }
  }

  if (marchas.length > 0) {
    corpo += '<h2>Analises de Marcha</h2><table><tr><th>Data</th><th>Angulo de Captura</th></tr>';
    marchas.forEach(av => {
      corpo += `<tr><td>${av.data_avaliacao}</td><td>${av.angulo}</td></tr>`;
    });
    corpo += '</table>';
    for (const av of marchas) {
      corpo += await montarImagensMarcha(av);
    }
  }

  // Deixa explicito o que nao foi realizado: a ausencia de um teste e um dado
  // clinico, nao um vazio no relatorio.
  const pendentes: string[] = [];
  if (adamses.length === 0) pendentes.push('Teste de Adams');
  if (marchas.length === 0) pendentes.push('Analise de marcha');
  if (adms.length === 0) pendentes.push('Amplitude de movimento');
  if (cervicais.length === 0) pendentes.push('Avaliacao cervical');
  if (pendentes.length > 0 && corpo !== '') {
    corpo += '<h2>Avaliacoes Complementares</h2><table><tr><th>Avaliacao</th><th>Situacao</th></tr>';
    pendentes.forEach(nome => {
      corpo += `<tr><td>${nome}</td><td>Nao realizada</td></tr>`;
    });
    corpo += '</table>';
  }

  if (corpo === '') {
    corpo = '<div class="info">Nenhuma avaliacao registrada para este paciente.</div>';
  }

  let clinico = '';
  if (p.conclusao_clinica || p.objetivos_terapeuticos || p.diagnostico) {
    clinico = '<h2>Conclusao Clinica</h2>';
    // Exame auxiliar: o achado e apresentado como possibilidade, nao como
    // diagnostico fechado.
    if (p.diagnostico) clinico += `<div class="bloco"><b>Possivel Diagnostico:</b> ${p.diagnostico}</div>`;
    if (p.conclusao_clinica) clinico += `<div class="bloco">${p.conclusao_clinica}</div>`;
    if (p.objetivos_terapeuticos) clinico += `<div class="bloco"><b>Objetivos:</b> ${p.objetivos_terapeuticos}</div>`;
  }

  // Resumo final: reune os achados alterados de cada vista, os indices globais
  // e o que ficou pendente, para leitura rapida ao fim do relatorio.
  let resumo = '';
  const alteradas: string[] = [];
  for (const av of posturais) {
    const medidas = medidasDaAvaliacao(av);
    const fora = medidas.filter(m => m.alerta).map(m => m.label);
    if (fora.length > 0) {
      alteradas.push(`<b>${av.vista.replace('_', ' ')}</b>: ${fora.join(', ')}`);
    }
  }
  if (alteradas.length > 0 || cervicais.length > 0 || pendentes.length > 0) {
    resumo = '<h2>Resumo dos Achados</h2>';
    if (alteradas.length > 0) {
      resumo += '<div class="bloco"><b>Alteracoes identificadas</b></div>';
      alteradas.forEach(l => { resumo += `<div class="bloco">${l}</div>`; });
    } else if (posturais.length > 0) {
      resumo += '<div class="bloco">Nenhum segmento fora dos parametros adotados.</div>';
    }
    if (cervicais.length > 0) {
      const ultima = cervicais[0];
      const alt = ultima.angulo < 48;
      resumo += `<div class="bloco"><b>Angulo craniovertebral:</b> ${ultima.angulo} graus - ${alt ? 'cabeca anteriorizada' : 'dentro da referencia'}</div>`;
    }
    if (pendentes.length > 0) {
      resumo += `<div class="bloco"><b>Nao realizadas:</b> ${pendentes.join(', ')}</div>`;
    }
    resumo += '<div class="bloco">Avaliacao fotogrametrica de triagem. Recomenda-se correlacao com avaliacao clinica presencial e demais testes funcionais.</div>';
  }

  const rodapeHtml2 = await rodapeCompleto();

  const html = `
    <html><head><meta charset="utf-8">${ESTILO}</head><body>
      ${cabecalho(p, 'Historico Completo do Paciente')}
      ${clinico}
      ${corpo}
      ${resumo}
      ${rodapeHtml2}
    </body></html>
  `;
  return gerarEcompartilhar(html);
}
