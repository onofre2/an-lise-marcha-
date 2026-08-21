import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { SEGMENTOS_RAPIDA, Vista } from '../../constants/posturalPoints';
import { calcularDesajustes } from '../../services/posturalCalculations';
import db from '../../services/database';
import { gerarRelatorioPostural } from '../../services/pdfService';

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
      const nova = db.getFirstSync('SELECT last_insert_rowid() as id') as { id: number };
      Alert.alert('Sucesso', 'Avaliacao salva! Deseja gerar o relatorio em PDF?', [
        { text: 'Agora nao', onPress: () => navigation.navigate('PosturalHome') },
        {
          text: 'Gerar PDF',
          onPress: async () => {
            try {
              await gerarRelatorioPostural(nova.id);
            } catch (e) {
              Alert.alert('Erro', 'Nao foi possivel gerar o PDF.');
            }
            navigation.navigate('PosturalHome');
          },
        },
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
          <View key={i} style={styles.card}>
            <Text style={styles.cardLabel}>{d.label}</Text>
            <View style={[styles.badge, d.alerta ? styles.badgeAlerta : styles.badgeOk]}>
              <Text style={[styles.badgeText, d.alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>
                {d.valor}{d.unidade}
              </Text>
            </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 1, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 2, backgroundColor: '#4ADE80', transformOrigin: 'left' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  cardLabel: { color: '#334155', fontSize: 14, flex: 1, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 56, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
