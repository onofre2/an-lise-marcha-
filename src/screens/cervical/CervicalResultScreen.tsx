import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import db from '../../services/database';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.55;

export default function CervicalResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, pontos } = route.params as {
    fotoUri: string; pacienteId: number; pontos: Record<string, Ponto>;
  };

  const angulo = useMemo(() => {
    if (!pontos.trago || !pontos.acromio) return null;
    const dx = pontos.trago.x - pontos.acromio.x;
    const dy = pontos.acromio.y - pontos.trago.y;
    const rad = Math.atan2(Math.abs(dx), dy);
    return Number((rad * (180 / Math.PI)).toFixed(1));
  }, [pontos]);

  const alerta = angulo !== null && angulo > 45;

  const salvarAvaliacao = () => {
    if (angulo === null) {
      Alert.alert('Erro', 'Marque os dois pontos antes de salvar.');
      return;
    }
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      db.runSync(
        `INSERT INTO avaliacoes_cervicais (id_paciente, data_avaliacao, foto_uri, pontos_json, angulo)
         VALUES (?, ?, ?, ?, ?)`,
        [pacienteId, dataHoje, fotoUri, JSON.stringify(pontos), angulo]
      );
      Alert.alert('Sucesso', 'Avaliação cervical salva no histórico do paciente!', [
        { text: 'OK', onPress: () => navigation.navigate('CervicalHome') },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliação cervical:', error);
      Alert.alert('Erro', 'Não foi possível salvar a avaliação.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {pontos.trago && pontos.acromio && (
          <>
            <View style={[styles.linhaVertical, { left: pontos.acromio.x, top: pontos.acromio.y - 150 }]} />
            <LinhaSegmento a={pontos.acromio} b={pontos.trago} />
          </>
        )}
        {Object.values(pontos).map((p, i) => (
          <View key={i} style={[styles.marcador, { left: p.x - 6, top: p.y - 6 }]} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Resultado</Text>
      {angulo === null ? (
        <Text style={styles.semDados}>Não foi possível calcular. Marque os dois pontos.</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Inclinação Cervical</Text>
          <View style={[styles.badge, alerta ? styles.badgeAlerta : styles.badgeOk]}>
            <Text style={[styles.badgeText, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{angulo}graus</Text>
          </View>
        </View>
      )}
      {alerta && (
        <Text style={styles.aviso}>Angulo acima de 45 graus pode indicar cabeca anteriorizada.</Text>
      )}

      <TouchableOpacity style={styles.btnSalvar} onPress={salvarAvaliacao}>
        <Text style={styles.btnSalvarText}>Salvar no Historico do Paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function LinhaSegmento({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View style={[styles.linha, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: ang + 'deg' }] }]} />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 1, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 2, backgroundColor: '#4ADE80', transformOrigin: 'left' },
  linhaVertical: { position: 'absolute', width: 2, height: 150, backgroundColor: '#94A3B8' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#334155', fontSize: 14, flex: 1, fontWeight: '500' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 56, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  aviso: { color: '#D97706', fontSize: 13, textAlign: 'center', marginBottom: 10 },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
