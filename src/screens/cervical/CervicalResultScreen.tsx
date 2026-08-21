import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import db from '../../services/database';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;

// Angulo entre a linha origem->alvo e a horizontal (0 a 90 graus)
function anguloComHorizontal(origem: Ponto, alvo: Ponto): number {
  const dx = Math.abs(alvo.x - origem.x);
  const dy = Math.abs(alvo.y - origem.y);
  if (dx === 0) return 90;
  return Number((Math.atan2(dy, dx) * (180 / Math.PI)).toFixed(1));
}

export default function CervicalResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, pontos } = route.params as {
    fotoUri: string; pacienteId: number; pontos: Record<string, Ponto>;
  };

  const cva = useMemo(() => {
    if (!pontos.c7 || !pontos.trago) return null;
    return anguloComHorizontal(pontos.c7, pontos.trago);
  }, [pontos]);

  const anguloOmbro = useMemo(() => {
    if (!pontos.acromio || !pontos.c7) return null;
    return anguloComHorizontal(pontos.acromio, pontos.c7);
  }, [pontos]);

  // Referencias clinicas: CVA normal >= 48 graus; angulo do ombro normal > 52 graus
  const alertaCva = cva !== null && cva < 48;
  const alertaOmbro = anguloOmbro !== null && anguloOmbro < 52;

  const salvarAvaliacao = () => {
    if (cva === null) {
      Alert.alert('Erro', 'Marque C7 e o trago antes de salvar.');
      return;
    }
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      db.runSync(
        'INSERT INTO avaliacoes_cervicais (id_paciente, data_avaliacao, foto_uri, pontos_json, angulo) VALUES (?, ?, ?, ?, ?)',
        [pacienteId, dataHoje, fotoUri, JSON.stringify(pontos), cva]
      );
      Alert.alert('Sucesso', 'Avaliacao cervical salva no historico do paciente!', [
        { text: 'OK', onPress: () => navigation.navigate('CervicalHome') },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliacao cervical:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a avaliacao.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {pontos.c7 && (
          <View style={[styles.linhaHorizontal, { left: pontos.c7.x - 60, top: pontos.c7.y }]} />
        )}
        {pontos.c7 && pontos.trago && <LinhaSegmento a={pontos.c7} b={pontos.trago} />}
        {pontos.c7 && pontos.acromio && <LinhaSegmento a={pontos.acromio} b={pontos.c7} />}
        {Object.values(pontos).map((p, i) => (
          <View key={i} style={[styles.marcador, { left: p.x - 6, top: p.y - 6 }]} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Resultado</Text>

      {cva === null ? (
        <Text style={styles.semDados}>Marque C7 e o trago para calcular.</Text>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardTexto}>
            <Text style={styles.cardLabel}>Angulo Craniovertebral</Text>
            <Text style={styles.cardRef}>Normal: 48 graus ou mais</Text>
          </View>
          <View style={[styles.badge, alertaCva ? styles.badgeAlerta : styles.badgeOk]}>
            <Text style={[styles.badgeText, alertaCva ? styles.badgeTextAlerta : styles.badgeTextOk]}>{cva} graus</Text>
          </View>
        </View>
      )}

      {anguloOmbro !== null && (
        <View style={styles.card}>
          <View style={styles.cardTexto}>
            <Text style={styles.cardLabel}>Angulo do Ombro</Text>
            <Text style={styles.cardRef}>Normal: acima de 52 graus</Text>
          </View>
          <View style={[styles.badge, alertaOmbro ? styles.badgeAlerta : styles.badgeOk]}>
            <Text style={[styles.badgeText, alertaOmbro ? styles.badgeTextAlerta : styles.badgeTextOk]}>{anguloOmbro} graus</Text>
          </View>
        </View>
      )}

      {alertaCva && (
        <Text style={styles.aviso}>CVA abaixo de 48 graus indica cabeca anteriorizada. Quanto menor o angulo, maior a anteriorizacao.</Text>
      )}
      {alertaOmbro && (
        <Text style={styles.aviso}>Angulo do ombro abaixo de 52 graus indica ombro protruso.</Text>
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
  linhaHorizontal: { position: 'absolute', width: 120, height: 2, backgroundColor: '#94A3B8' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTexto: { flex: 1 },
  cardLabel: { color: '#334155', fontSize: 14, fontWeight: '600' },
  cardRef: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 70, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  aviso: { color: '#D97706', fontSize: 12, marginBottom: 8, lineHeight: 17 },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
