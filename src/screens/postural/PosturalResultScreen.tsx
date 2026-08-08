import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SEGMENTOS_RAPIDA, Vista } from '../../constants/posturalPoints';
import { calcularDesajustes } from '../../services/posturalCalculations';
import db from '../../services/database';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;

export default function PosturalResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, vista, modo, pontos } = route.params as {
    fotoUri: string; pacienteId: number; vista: Vista; modo: 'rapida' | 'completa'; pontos: Record<string, Ponto>;
  };

  const desajustes = useMemo(() => calcularDesajustes(vista, pontos), [vista, pontos]);
  const segmentos = SEGMENTOS_RAPIDA[vista];

  const salvarAvaliacao = () => {
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      db.runSync(
        `INSERT INTO avaliacoes_posturais (id_paciente, vista, modo, data_avaliacao, foto_uri, pontos_json, medidas_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [pacienteId, vista, modo, dataHoje, fotoUri, JSON.stringify(pontos), JSON.stringify(desajustes)]
      );
      Alert.alert('Sucesso', 'Avaliação postural salva no histórico do paciente!', [
        { text: 'OK', onPress: () => navigation.navigate('EvaluationHome') },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliação postural:', error);
      Alert.alert('Erro', 'Não foi possível salvar a avaliação.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {segmentos.map(([idA, idB], i) => {
          const a = pontos[idA];
          const b = pontos[idB];
          if (!a || !b) return null;
          return <LinhaSegmento key={i} a={a} b={b} />;
        })}
        {Object.values(pontos).map((p, i) => (
          <View key={i} style={[styles.marcador, { left: p.x - 6, top: p.y - 6 }]} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Desajustes Encontrados</Text>
      {desajustes.length === 0 ? (
        <Text style={styles.semDados}>Nenhum desajuste calculável com os pontos marcados.</Text>
      ) : (
        desajustes.map((d, i) => (
          <View key={i} style={[styles.card, d.alerta && styles.cardAlerta]}>
            <Text style={styles.cardLabel}>{d.label}</Text>
            <Text style={[styles.cardValor, d.alerta && styles.cardValorAlerta]}>
              {d.valor}{d.unidade} {d.alerta ? '⚠️' : '✓'}
            </Text>
          </View>
        ))
      )}

      <TouchableOpacity style={styles.btnSalvar} onPress={salvarAvaliacao}>
        <Text style={styles.btnSalvarText}>Salvar no Histórico do Paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function LinhaSegmento({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const angulo = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);

  return (
    <View
      style={[
        styles.linha,
        { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: `${angulo}deg` }] },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 16, paddingBottom: 40 },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 2, backgroundColor: '#38BDF8', transformOrigin: 'left' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#94A3B8', marginBottom: 12 },
  semDados: { color: '#64748B', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#1E293B', padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#334155', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAlerta: { borderColor: '#F59E0B' },
  cardLabel: { color: '#F8FAFC', fontSize: 14, flex: 1 },
  cardValor: { color: '#10B981', fontWeight: 'bold', fontSize: 15 },
  cardValorAlerta: { color: '#F59E0B' },
  btnSalvar: { backgroundColor: '#0284C7', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
