import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import db from '../../services/database';

interface Medida { label: string; valor: number; unidade: string; alerta: boolean; }
interface Avaliacao { id: number; vista: string; data_avaliacao: string; medidas_json: string | null; }

export default function ComparacaoScreen({ route }: any) {
  const { pacienteId } = route.params as { pacienteId: number };

  const avaliacoes = useMemo(() => {
    try {
      return db.getAllSync(
        'SELECT id, vista, data_avaliacao, medidas_json FROM avaliacoes_posturais WHERE id_paciente = ? ORDER BY data_avaliacao DESC, id DESC',
        [pacienteId]
      ) as Avaliacao[];
    } catch {
      return [];
    }
  }, [pacienteId]);

  const [idA, setIdA] = useState<number | null>(avaliacoes[1]?.id ?? null);
  const [idB, setIdB] = useState<number | null>(avaliacoes[0]?.id ?? null);

  const medidasDe = (id: number | null): Medida[] => {
    const av = avaliacoes.find(a => a.id === id);
    if (!av || !av.medidas_json) return [];
    try { return JSON.parse(av.medidas_json) as Medida[]; } catch { return []; }
  };

  const linhas = useMemo(() => {
    const a = medidasDe(idA);
    const b = medidasDe(idB);
    const labels = Array.from(new Set([...a.map(m => m.label), ...b.map(m => m.label)]));
    return labels.map(label => {
      const mA = a.find(m => m.label === label);
      const mB = b.find(m => m.label === label);
      const delta = mA && mB ? Number((mB.valor - mA.valor).toFixed(1)) : null;
      return { label, a: mA, b: mB, delta, unidade: mA?.unidade || mB?.unidade || '' };
    });
  }, [idA, idB, avaliacoes]);

  const rotulo = (av: Avaliacao) => `${av.data_avaliacao} - ${av.vista}`;

  if (avaliacoes.length < 2) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTexto}>
          E necessario ter ao menos duas avaliacoes posturais salvas para comparar.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={styles.titulo}>Comparar avaliacoes</Text>

      <Text style={styles.label}>Avaliacao anterior</Text>
      <View style={styles.chips}>
        {avaliacoes.map(av => (
          <TouchableOpacity key={`a-${av.id}`} style={[styles.chip, idA === av.id && styles.chipAtivo]} onPress={() => setIdA(av.id)}>
            <Text style={[styles.chipTexto, idA === av.id && styles.chipTextoAtivo]}>{rotulo(av)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Avaliacao atual</Text>
      <View style={styles.chips}>
        {avaliacoes.map(av => (
          <TouchableOpacity key={`b-${av.id}`} style={[styles.chip, idB === av.id && styles.chipAtivo]} onPress={() => setIdB(av.id)}>
            <Text style={[styles.chipTexto, idB === av.id && styles.chipTextoAtivo]}>{rotulo(av)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tabelaHeader}>
        <Text style={[styles.th, { flex: 2 }]}>Medida</Text>
        <Text style={styles.th}>Antes</Text>
        <Text style={styles.th}>Depois</Text>
        <Text style={styles.th}>Variacao</Text>
      </View>

      {linhas.map((l, i) => (
        <View key={i} style={styles.linha}>
          <Text style={[styles.td, { flex: 2 }]}>{l.label}</Text>
          <Text style={styles.td}>{l.a ? `${l.a.valor}${l.unidade}` : '-'}</Text>
          <Text style={styles.td}>{l.b ? `${l.b.valor}${l.unidade}` : '-'}</Text>
          <Text style={[styles.td, l.delta === null ? null : l.delta > 0 ? styles.piorou : l.delta < 0 ? styles.melhorou : null]}>
            {l.delta === null ? '-' : `${l.delta > 0 ? '+' : ''}${l.delta}${l.unidade}`}
          </Text>
        </View>
      ))}

      <Text style={styles.nota}>
        Variacao negativa indica reducao do desvio entre as duas avaliacoes.
        Comparacoes entre vistas diferentes nao sao equivalentes.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  vazio: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  vazioTexto: { color: '#64748B', fontSize: 15, textAlign: 'center' },
  titulo: { fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 12, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0' },
  chipAtivo: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  chipTexto: { color: '#334155', fontSize: 12 },
  chipTextoAtivo: { color: '#FFF', fontWeight: '600' },
  tabelaHeader: { flexDirection: 'row', marginTop: 20, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#E2E8F0' },
  th: { flex: 1, fontSize: 12, fontWeight: '700', color: '#475569' },
  linha: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  td: { flex: 1, fontSize: 13, color: '#0F172A' },
  piorou: { color: '#DC2626', fontWeight: '700' },
  melhorou: { color: '#16A34A', fontWeight: '700' },
  nota: { marginTop: 20, fontSize: 12, color: '#94A3B8', lineHeight: 18 },
});
