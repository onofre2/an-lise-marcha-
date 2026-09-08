import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import db from '../../services/database';
import { normalizarObservacoes, observacoesEmPixel } from '../../services/observacoes';
import { SEGMENTOS_RAPIDA, Vista } from '../../constants/posturalPoints';
import { calcularDesajustes, Desajuste } from '../../services/posturalCalculations';
import { MOVIMENTOS } from '../../constants/movimentos';
import { FASES_MARCHA } from '../../constants/fasesMarcha';
import { calcularFase } from '../../services/marchaCalculations';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 40;

// Dimensoes de referencia da area de video onde os pontos da marcha foram
// marcados. Usadas para converter as coordenadas normalizadas de volta.
// Dimensoes da area onde os pontos foram marcados, gravadas junto com a
// avaliacao. Avaliacoes antigas nao tem esse dado: nesse caso usamos o
// tamanho padrao vigente na epoca, que e melhor que nao calcular nada.
const FRAME_W = Dimensions.get('window').width - 72;
const FRAME_H = FRAME_W * 0.75;
const CADEIA_MARCHA = ['tronco', 'quadril', 'joelho', 'tornozelo', 'pe'];

function dimensoesDaAvaliacao(registro: any): { largura: number; altura: number } {
  try {
    if (registro?.dimensoes_json) {
      const d = JSON.parse(registro.dimensoes_json);
      if (d?.largura > 0 && d?.altura > 0) return d;
    }
  } catch {}
  return { largura: 343, altura: 320 };
}

export default function AvaliacaoDetailScreen({ route, navigation }: any) {
  const { tipo, id } = route.params as { tipo: 'postural' | 'cervical' | 'adm' | 'marcha' | 'adams'; id: number };

  const [registro, setRegistro] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    try {
      const tabelas: Record<string, string> = {
        postural: 'avaliacoes_posturais',
        cervical: 'avaliacoes_cervicais',
        adm: 'avaliacoes_adm',
        marcha: 'avaliacoes',
        adams: 'avaliacoes_adams',
      };
      const resultado = db.getFirstSync(`SELECT * FROM ${tabelas[tipo]} WHERE id = ?`, [id]);
      if (resultado) setRegistro(resultado);
      else setErro('Avaliacao nao encontrada.');
    } catch (e) {
      console.error('Erro ao carregar avaliacao:', e);
      setErro('Nao foi possivel carregar a avaliacao.');
    }
  }, [tipo, id]);

  const pontos: Record<string, Ponto> = useMemo(() => {
    if (!registro || !registro.pontos_json) return {};
    try {
      return JSON.parse(registro.pontos_json);
    } catch {
      return {};
    }
  }, [registro]);

  // A avaliacao postural grava os pontos normalizados (0 a 1) para que possam
  // ser redesenhados em qualquer tela. Os demais modulos ainda gravam em pixel.
  const pontosDesenho = useMemo(() => {
    // Multiplica pela area de exibicao DESTA tela, nao pela da tela de edicao:
    // a coordenada normalizada e independente de tamanho, e por isso funciona.
    const out: Record<string, { x: number; y: number }> = {};
    for (const [id, pt] of Object.entries(pontos as Record<string, { x: number; y: number }>)) {
      out[id] = { x: pt.x * IMAGE_WIDTH, y: pt.y * IMAGE_HEIGHT };
    }
    return out;
  }, [pontos, tipo]);

  // Circulos de desajuste marcados sobre os frames da marcha.
  const observacoesMarcha = useMemo(() => {
    if (!registro?.observacoes_json) return {} as Record<string, Record<string, { x: number; y: number }>>;
    try { return JSON.parse(registro.observacoes_json); } catch { return {}; }
  }, [registro]);

  // Frames capturados de cada fase da marcha, guardados na avaliacao.
  const framesMarcha = useMemo(() => {
    if (!registro?.frames_json) return {} as Record<string, string>;
    try { return JSON.parse(registro.frames_json) as Record<string, string>; } catch { return {}; }
  }, [registro]);

  const observacoes = useMemo(() => {
    if (!registro?.observacoes_json) return {};
    try { return normalizarObservacoes(JSON.parse(registro.observacoes_json)); } catch { return {}; }
  }, [registro]);

  // Mesma conversao para os circulos de observacao da avaliacao postural.
  // Todos os modulos gravam coordenadas normalizadas (0 a 1), entao a
  // conversao para pixel vale para qualquer tipo de avaliacao.
  const observacoesDesenho = useMemo(
    () => observacoesEmPixel(observacoes, IMAGE_WIDTH, IMAGE_HEIGHT),
    [observacoes]
  );


  const desajustes: Desajuste[] = useMemo(() => {
    if (!registro) return [];
    if (tipo === 'postural') {
      if (registro.medidas_json) {
        try { return JSON.parse(registro.medidas_json); } catch { /* recalcula abaixo */ }
      }
      return calcularDesajustes(registro.vista, pontos);
    }
    return [];
  }, [registro, tipo, pontos]);

  if (erro) {
    return (
      <View style={styles.centro}>
        <Text style={styles.erroTexto}>{erro}</Text>
      </View>
    );
  }

  if (!registro) {
    return (
      <View style={styles.centro}>
        <Text style={styles.carregando}>Carregando...</Text>
      </View>
    );
  }

  const segmentos = tipo === 'postural' && registro.vista ? SEGMENTOS_RAPIDA[registro.vista as Vista] : [];
  const movimento = tipo === 'adm' ? MOVIMENTOS.find(m => m.nome === registro.movimento) : undefined;
  const idsADM = movimento ? movimento.pontos.map(p => p.id) : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>{tituloDaAvaliacao(tipo, registro)}</Text>
      <Text style={styles.data}>{registro.data_avaliacao}</Text>

      {(() => {
        let achados: any[] = [];
        try { achados = registro.achados_json ? JSON.parse(registro.achados_json) : []; } catch {}
        if (achados.length === 0) return null;
        return (
          <>
            <Text style={styles.sectionTitle}>Diagnóstico Clínico Sugerido</Text>
            {achados.map((a: any, i: number) => (
              <View key={i} style={[styles.cardAchado, a.alerta && styles.cardAchadoAlerta]}>
                <Text style={styles.cardAchadoTitulo}>{a.titulo}</Text>
                <Text style={styles.cardAchadoTexto}>{a.descricao}</Text>
              </View>
            ))}
          </>
        );
      })()}

      {tipo === 'postural' && registro.foto_uri ? (
        <TouchableOpacity
          style={styles.btnReeditar}
          onPress={() => navigation.navigate('PosturalTab', {
            screen: 'PosturalResult',
            params: {
              avaliacaoId: registro.id,
              fotoUri: registro.foto_uri,
              pacienteId: registro.id_paciente,
              vista: registro.vista,
              modo: registro.modo,
              pontos,
            },
          })}
        >
          <Text style={styles.btnReeditarText}>Reabrir para editar pontos</Text>
        </TouchableOpacity>
      ) : null}

      {registro.foto_uri ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: registro.foto_uri }}
            style={[styles.image, registro.sem_cor === 1 && styles.imagemSemCor]}
            resizeMode="contain"
          />
          {registro.sem_cor === 1 && <View pointerEvents="none" style={styles.camadaSemCor} />}

          {tipo === 'postural' && (() => {
            // Eixo ideal (vertical verde) e eixo real do tronco (vermelho),
            // os mesmos da tela de edicao e do relatorio.
            const p = pontosDesenho as Record<string, { x: number; y: number }>;
            const tD = p.tornozelo_d, tE = p.tornozelo_e, ml = p.maleolo;
            const baseX = tD && tE ? (tD.x + tE.x) / 2 : ml ? ml.x : null;
            const acD = p.acromio_d, acE = p.acromio_e;
            const eiD = p.eias_d || p.eips_d, eiE = p.eias_e || p.eips_e;
            let topo: { x: number; y: number } | null = null;
            let baixo: { x: number; y: number } | null = null;
            if (acD && acE && eiD && eiE) {
              topo = { x: (acD.x + acE.x) / 2, y: (acD.y + acE.y) / 2 };
              baixo = { x: (eiD.x + eiE.x) / 2, y: (eiD.y + eiE.y) / 2 };
            } else if (p.acromio && p.trocanter) {
              topo = p.acromio;
              baixo = p.trocanter;
            }
            const camadas = [] as any[];
            if (baseX !== null) {
              camadas.push(<View key="eixo-verde" style={[styles.eixoIdeal, { left: baseX }]} />);
            }
            if (topo && baixo) {
              const dy = baixo.y - topo.y;
              const inc = dy === 0 ? 0 : (baixo.x - topo.x) / dy;
              const xTopo = topo.x + (0 - topo.y) * inc;
              const xBase = topo.x + (IMAGE_HEIGHT - topo.y) * inc;
              const comp = Math.sqrt((xBase - xTopo) ** 2 + IMAGE_HEIGHT ** 2);
              const ang = Math.atan2(IMAGE_HEIGHT, xBase - xTopo) * (180 / Math.PI);
              // Posicionada pelo centro: o giro a partir da borda tiraria a
              // linha do lugar quando o angulo se aproxima de 90 graus.
              const centroX = (xTopo + xBase) / 2;
              camadas.push(
                <View
                  key="eixo-vermelho"
                  style={[styles.eixoReal, {
                    left: centroX - comp / 2,
                    top: IMAGE_HEIGHT / 2,
                    width: comp,
                    transform: [{ rotate: `${ang}deg` }],
                  }]}
                />
              );
            }
            return camadas;
          })()}

          {tipo === 'postural' && segmentos.map(([idA, idB], i) => {
            const a = pontosDesenho[idA];
            const b = pontosDesenho[idB];
            if (!a || !b) return null;
            return <Linha key={i} a={a} b={b} />;
          })}

          {tipo === 'adams' && pontosDesenho.dorso_d && pontosDesenho.dorso_e && <Linha a={pontosDesenho.dorso_d} b={pontosDesenho.dorso_e} />}
          {tipo === 'cervical' && pontosDesenho.c7 && pontosDesenho.trago && <Linha a={pontosDesenho.c7} b={pontosDesenho.trago} />}
          {tipo === 'cervical' && pontosDesenho.c7 && pontosDesenho.acromio && <Linha a={pontosDesenho.acromio} b={pontosDesenho.c7} />}

          {tipo === 'adm' && idsADM.length === 3 && pontosDesenho[idsADM[1]] && pontosDesenho[idsADM[0]] && (
            <Linha a={pontosDesenho[idsADM[1]]} b={pontosDesenho[idsADM[0]]} />
          )}
          {tipo === 'adm' && idsADM.length === 3 && pontosDesenho[idsADM[1]] && pontosDesenho[idsADM[2]] && (
            <Linha a={pontosDesenho[idsADM[1]]} b={pontosDesenho[idsADM[2]]} />
          )}

          {Object.values(pontosDesenho).map((p, i) => (
            <View key={i} style={[styles.marcador, { left: p.x - 6, top: p.y - 6 }]} />
          ))}

          {Object.values(observacoesDesenho).map((o: any, i) => {
            const dx = o.ponta.x - o.base.x;
            const dy = o.ponta.y - o.base.y;
            const comp = Math.sqrt(dx * dx + dy * dy);
            const ang = Math.atan2(dy, dx) * (180 / Math.PI);
            // Fragmento, nao View: um View comum entraria no fluxo normal e
            // tiraria os filhos absolutos da area da imagem.
            return (
              <React.Fragment key={`obs-${i}`}>
                <View style={[styles.setaHaste, { left: o.base.x, top: o.base.y, width: comp, transform: [{ rotate: `${ang}deg` }] }]} />
                <View style={[styles.setaPonta, { left: o.ponta.x - 5, top: o.ponta.y - 5, transform: [{ rotate: `${ang}deg` }] }]} />
                <Text style={[styles.setaRotulo, { left: dx > 0 ? o.base.x - 48 : o.base.x + 5, top: o.base.y - 6 }]}>desajuste</Text>
              </React.Fragment>
            );
          })}
        </View>
      ) : null}

      {tipo === 'marcha' && !registro.marcacoes_json && (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            Esta avaliacao registrou apenas o video e o angulo de captura. As marcacoes por fase passaram a ser salvas em avaliacoes mais recentes.
          </Text>
        </View>
      )}

      {tipo === 'marcha' && registro.marcacoes_json && (
        <View>
          {FASES_MARCHA.map(f => {
            let marcacoes: any = {};
            try { marcacoes = JSON.parse(registro.marcacoes_json); } catch { marcacoes = {}; }
            const resultados = calcularFase(f.id, marcacoes[f.id] || {}, dimensoesDaAvaliacao(registro));
            if (resultados.length === 0) return null;
            return (
              <View key={f.id} style={styles.blocoFase}>
                <Text style={styles.blocoFaseNome}>{f.nome}</Text>
                {framesMarcha[f.id] ? (
                  <View style={styles.frameWrap}>
                    <Image source={{ uri: framesMarcha[f.id] }} style={styles.frameImg} resizeMode="contain" />
                    {CADEIA_MARCHA.slice(0, -1).map((id, i) => {
                      const a = marcacoes[f.id]?.[id];
                      const b = marcacoes[f.id]?.[CADEIA_MARCHA[i + 1]];
                      if (!a || !b) return null;
                      const ax = a.x * FRAME_W, ay = a.y * FRAME_H;
                      const bx = b.x * FRAME_W, by = b.y * FRAME_H;
                      const comp = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
                      const ang = Math.atan2(by - ay, bx - ax) * (180 / Math.PI);
                      return (
                        <View
                          key={`l-${i}`}
                          style={[styles.frameLinha, { left: ax, top: ay, width: comp, transform: [{ rotate: `${ang}deg` }] }]}
                        />
                      );
                    })}
                    {CADEIA_MARCHA.map(id => {
                      const pt = marcacoes[f.id]?.[id];
                      if (!pt) return null;
                      return (
                        <View
                          key={`p-${id}`}
                          style={[styles.framePonto, { left: pt.x * FRAME_W - 6, top: pt.y * FRAME_H - 6 }]}
                        />
                      );
                    })}
                    {Object.entries(observacoesMarcha[f.id] || {}).map(([oid, pt]: any) => (
                      <View
                        key={`o-${oid}`}
                        style={[styles.frameObs, { left: pt.x * FRAME_W - 12, top: pt.y * FRAME_H - 12 }]}
                      />
                    ))}
                  </View>
                ) : null}
                {resultados.map((r, i) => (
                  <View key={i} style={styles.card}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardLabel}>{r.nome}</Text>
                      <Text style={styles.cardRef}>Esperado: {r.referencia}</Text>
                    </View>
                    <View style={[styles.badge, r.dentroFaixa ? styles.badgeOk : styles.badgeAlerta]}>
                      <Text style={[styles.badgeText, r.dentroFaixa ? styles.badgeTextOk : styles.badgeTextAlerta]}>{r.valor}°</Text>
                    </View>
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Medidas</Text>
      {renderMedidas(tipo, registro, desajustes)}
    </ScrollView>
  );
}

function tituloDaAvaliacao(tipo: string, registro: any): string {
  if (tipo === 'postural') return `Postural — ${String(registro.vista || '').replace('_', ' ')}`;
  if (tipo === 'adams') return 'Teste de Inclinacao de Adams';
  if (tipo === 'cervical') return 'Avaliacao Cervical';
  if (tipo === 'adm') return `ADM — ${registro.movimento || ''}`;
  return `Marcha — ${registro.angulo || ''}`;
}

function renderMedidas(tipo: string, registro: any, desajustes: Desajuste[]) {
  if (tipo === 'postural') {
    if (desajustes.length === 0) {
      return <Text style={styles.semDados}>Nenhuma medida registrada.</Text>;
    }
    return (
      <>
        {desajustes.map((d, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardLabel}>{d.label}</Text>
            <View style={[styles.badge, d.alerta ? styles.badgeAlerta : styles.badgeOk]}>
              <Text style={[styles.badgeText, d.alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>
                {d.valor}{d.unidade}
              </Text>
            </View>
          </View>
        ))}
      </>
    );
  }

  if (tipo === 'cervical') {
    const alerta = registro.angulo < 48;
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>Angulo Craniovertebral</Text>
          <Text style={styles.cardRef}>Normal: 48 graus ou mais</Text>
        </View>
        <View style={[styles.badge, alerta ? styles.badgeAlerta : styles.badgeOk]}>
          <Text style={[styles.badgeText, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{registro.angulo}°</Text>
        </View>
      </View>
    );
  }

  if (tipo === 'adams') {
    const alerta = registro.angulo >= 5;
    return (
      <>
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Inclinacao entre os lados</Text>
            <Text style={styles.cardRef}>Alerta a partir de 5 graus</Text>
          </View>
          <View style={[styles.badge, alerta ? styles.badgeAlerta : styles.badgeOk]}>
            <Text style={[styles.badgeText, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{registro.angulo}&deg;</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Lado mais elevado</Text>
          <View style={[styles.badge, styles.badgeNeutro]}>
            <Text style={[styles.badgeText, styles.badgeTextNeutro]}>{registro.lado_elevado || '-'}</Text>
          </View>
        </View>
      </>
    );
  }

  if (tipo === 'adm') {
    const deficit = Number((registro.referencia - registro.angulo).toFixed(1));
    const alerta = deficit >= 10;
    return (
      <>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Amplitude Medida</Text>
          <View style={[styles.badge, styles.badgeOk]}>
            <Text style={[styles.badgeText, styles.badgeTextOk]}>{registro.angulo}°</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Referencia Normal</Text>
          <View style={[styles.badge, styles.badgeNeutro]}>
            <Text style={[styles.badgeText, styles.badgeTextNeutro]}>{registro.referencia}°</Text>
          </View>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Deficit</Text>
          <View style={[styles.badge, alerta ? styles.badgeAlerta : styles.badgeOk]}>
            <Text style={[styles.badgeText, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{deficit}°</Text>
          </View>
        </View>
      </>
    );
  }

  return <Text style={styles.semDados}>Sem medidas detalhadas para este tipo de avaliacao.</Text>;
}

function Linha({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View style={[styles.linha, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: ang + 'deg' }] }]} />
  );
}

const styles = StyleSheet.create({
  frameWrap: { width: FRAME_W, height: FRAME_H, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  frameImg: { width: FRAME_W, height: FRAME_H },
  frameLinha: { position: 'absolute', height: 2, backgroundColor: '#22C55E', transformOrigin: 'left' },
  frameObs: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#EF4444' },
  framePonto: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#22C55E' },
  imagemSemCor: { opacity: 0.55 },
  camadaSemCor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', opacity: 0.18 },
  cardAchado: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#94A3B8' },
  cardAchadoAlerta: { backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' },
  cardAchadoTitulo: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  cardAchadoTexto: { fontSize: 13, color: '#475569', lineHeight: 18 },
  blocoDiagnostico: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  blocoDiagnosticoTitulo: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 4 },
  blocoDiagnosticoTexto: { fontSize: 14, color: '#1E3A8A', lineHeight: 20 },
  btnReeditar: { backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12, marginBottom: 4 },
  btnReeditarText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 20 },
  carregando: { color: '#64748B', fontSize: 14 },
  erroTexto: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  titulo: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  data: { fontSize: 12, color: '#94A3B8', marginTop: 2, marginBottom: 16 },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 1, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 2, backgroundColor: '#4ADE80', transformOrigin: 'left' },
  eixoIdeal: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#22C55E' },
  eixoReal: { position: 'absolute', height: 2, backgroundColor: '#EF4444' },
  setaPonta: {
    position: 'absolute', width: 0, height: 0, backgroundColor: 'transparent',
    borderTopWidth: 3.5, borderBottomWidth: 3.5, borderLeftWidth: 7,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#EF4444',
  },
  setaHaste: { position: 'absolute', height: 1.5, backgroundColor: '#EF4444', transformOrigin: 'left' },
  setaRotulo: { position: 'absolute', fontSize: 8, fontWeight: '700', color: '#EF4444', width: 44, textAlign: 'center' },
  marcadorObservacao: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 3, borderColor: '#EF4444', backgroundColor: 'transparent' },
  aviso: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12, marginBottom: 16 },
  blocoFase: { marginBottom: 16 },
  blocoFaseNome: { fontSize: 14, fontWeight: 'bold', color: '#0284C7', marginBottom: 8 },
  avisoTexto: { color: '#92400E', fontSize: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#334155', fontSize: 14, flex: 1, fontWeight: '500' },
  cardRef: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 60, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeNeutro: { backgroundColor: '#F1F5F9' },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  badgeTextNeutro: { color: '#64748B' },
});
