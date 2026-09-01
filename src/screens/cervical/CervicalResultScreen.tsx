import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions, PanResponder } from 'react-native';
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
  const totalAlertas = (alertaCva ? 1 : 0) + (alertaOmbro ? 1 : 0);

  const resumo = useMemo(() => {
    if (cva === null) return null;
    if (totalAlertas === 0) return 'Nenhum desajuste significativo encontrado nesta avaliação.';
    const partes: string[] = [];
    if (alertaCva) partes.push('cabeça anteriorizada');
    if (alertaOmbro) partes.push('ombro protruso');
    return `${totalAlertas} desajuste${totalAlertas > 1 ? 's' : ''} detectado${totalAlertas > 1 ? 's' : ''}: ${partes.join(', ')}. Recomenda-se avaliação clínica complementar.`;
  }, [cva, totalAlertas, alertaCva, alertaOmbro]);

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
      {resumo && (
        <View style={[styles.resumoCard, totalAlertas > 0 ? styles.resumoAlerta : styles.resumoOk]}>
          <Text style={[styles.resumoTexto, totalAlertas > 0 ? styles.resumoTextoAlerta : styles.resumoTextoOk]}>{resumo}</Text>
        </View>
      )}

      <View style={styles.imageContainer}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {pontos.c7 && <LinhaReferenciaHorizontal ponto={pontos.c7} />}
        {pontos.c7 && pontos.trago && (
          <>
            <LinhaSegmento a={pontos.c7} b={pontos.trago} alerta={alertaCva} />
            <BadgeNaLinha a={pontos.c7} b={pontos.trago} valor={cva} alerta={alertaCva} />
          </>
        )}
        {pontos.c7 && pontos.acromio && (
          <>
            <LinhaSegmento a={pontos.acromio} b={pontos.c7} alerta={alertaOmbro} />
            <BadgeNaLinha a={pontos.acromio} b={pontos.c7} valor={anguloOmbro} alerta={alertaOmbro} />
          </>
        )}
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

      <TouchableOpacity style={styles.btnSalvar} onPress={salvarAvaliacao}>
        <Text style={styles.btnSalvarText}>Salvar no Historico do Paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function LinhaSegmento({ a, b, alerta }: { a: Ponto; b: Ponto; alerta?: boolean }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View style={[styles.linha, alerta ? styles.linhaAlerta : styles.linhaOk, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: ang + 'deg' }] }]} />
  );
}

function LinhaReferenciaHorizontal({ ponto }: { ponto: Ponto }) {
  const [offsetY, setOffsetY] = useState(0);
  const startOffset = React.useRef(0);
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startOffset.current = offsetY; },
      onPanResponderMove: (evt, g) => setOffsetY(startOffset.current + g.dy),
    })
  ).current;

  return (
    <View {...panResponder.panHandlers} style={[styles.linhaRefArea, { left: ponto.x - 75, top: ponto.y - 10 + offsetY }]}>
      <View style={styles.linhaRefTraco} />
    </View>
  );
}

function BadgeNaLinha({ a, b, valor, alerta }: { a: Ponto; b: Ponto; valor: number | null; alerta: boolean }) {
  if (valor === null) return null;
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  return (
    <View style={[styles.badgeFlutuante, alerta ? styles.badgeAlerta : styles.badgeOk, { left: x - 22, top: y - 28 }]}>
      <Text style={[styles.badgeFlutuanteTexto, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{valor}°</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  resumoCard: { padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  resumoOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  resumoAlerta: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  resumoTexto: { fontSize: 13, lineHeight: 19 },
  resumoTextoOk: { color: '#166534' },
  resumoTextoAlerta: { color: '#92400E' },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 1, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 3, transformOrigin: 'left' },
  linhaOk: { backgroundColor: '#4ADE80' },
  linhaAlerta: { backgroundColor: '#F59E0B' },
  linhaRefArea: { position: 'absolute', width: 150, height: 20, justifyContent: 'center' },
  linhaRefTraco: { height: 1.5, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(148,163,184,0.9)', width: '100%' },
  badgeFlutuante: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 40, alignItems: 'center' },
  badgeFlutuanteTexto: { fontSize: 11, fontWeight: 'bold' },
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
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
