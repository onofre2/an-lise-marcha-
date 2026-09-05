import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Dimensions } from 'react-native';
import db from '../../services/database';
import { SEGMENTOS_RAPIDA, Vista } from '../../constants/posturalPoints';
import { calcularDesajustes, Desajuste } from '../../services/posturalCalculations';
import { MOVIMENTOS } from '../../constants/movimentos';
import { FASES_MARCHA } from '../../constants/fasesMarcha';
import { calcularFase } from '../../services/marchaCalculations';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;

export default function AvaliacaoDetailScreen({ route }: any) {
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

  const observacoes: Record<string, Ponto> = useMemo(() => {
    if (!registro || !registro.observacoes_json) return {};
    try {
      return JSON.parse(registro.observacoes_json);
    } catch {
      return {};
    }
  }, [registro]);

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

      {registro.foto_uri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: registro.foto_uri }} style={styles.image} resizeMode="contain" />

          {tipo === 'postural' && segmentos.map(([idA, idB], i) => {
            const a = pontos[idA];
            const b = pontos[idB];
            if (!a || !b) return null;
            return <Linha key={i} a={a} b={b} />;
          })}

          {tipo === 'adams' && pontos.dorso_d && pontos.dorso_e && <Linha a={pontos.dorso_d} b={pontos.dorso_e} />}
          {tipo === 'cervical' && pontos.c7 && pontos.trago && <Linha a={pontos.c7} b={pontos.trago} />}
          {tipo === 'cervical' && pontos.c7 && pontos.acromio && <Linha a={pontos.acromio} b={pontos.c7} />}

          {tipo === 'adm' && idsADM.length === 3 && pontos[idsADM[1]] && pontos[idsADM[0]] && (
            <Linha a={pontos[idsADM[1]]} b={pontos[idsADM[0]]} />
          )}
          {tipo === 'adm' && idsADM.length === 3 && pontos[idsADM[1]] && pontos[idsADM[2]] && (
            <Linha a={pontos[idsADM[1]]} b={pontos[idsADM[2]]} />
          )}

          {Object.values(pontos).map((p, i) => (
            <View key={i} style={[styles.marcador, { left: p.x - 6, top: p.y - 6 }]} />
          ))}

          {Object.values(observacoes).map((p, i) => (
            <View key={`obs-${i}`} style={[styles.marcadorObservacao, { left: p.x - 12, top: p.y - 12 }]} />
          ))}
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
            const resultados = calcularFase(f.id, marcacoes[f.id] || {});
            if (resultados.length === 0) return null;
            return (
              <View key={f.id} style={styles.blocoFase}>
                <Text style={styles.blocoFaseNome}>{f.nome}</Text>
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
