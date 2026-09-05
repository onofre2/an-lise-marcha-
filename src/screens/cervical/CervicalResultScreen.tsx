import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions, PanResponder } from 'react-native';
import db from '../../services/database';
import MarcadorComLupa from '../../components/MarcadorComLupa';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 32;

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

  const [pontosEditaveis, setPontosEditaveis] = useState<Record<string, Ponto>>(pontos);

  const moverPonto = (id: string, x: number, y: number) => {
    setPontosEditaveis(prev => ({ ...prev, [id]: { x, y } }));
  };

  const restaurarPontos = () => setPontosEditaveis(pontos);

  const cva = useMemo(() => {
    if (!pontosEditaveis.c7 || !pontosEditaveis.trago) return null;
    return anguloComHorizontal(pontosEditaveis.c7, pontosEditaveis.trago);
  }, [pontosEditaveis]);

  const anguloOmbro = useMemo(() => {
    if (!pontosEditaveis.acromio || !pontosEditaveis.c7) return null;
    return anguloComHorizontal(pontosEditaveis.acromio, pontosEditaveis.c7);
  }, [pontosEditaveis]);

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
        [pacienteId, dataHoje, fotoUri, JSON.stringify(pontosEditaveis), cva]
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
        {pontosEditaveis.c7 && <LinhaReferenciaHorizontal ponto={pontosEditaveis.c7} />}
        {pontosEditaveis.c7 && pontosEditaveis.trago && (
          <>
            <LinhaSegmento a={pontosEditaveis.c7} b={pontosEditaveis.trago} alerta={alertaCva} />
            <BadgeNaLinha a={pontosEditaveis.c7} b={pontosEditaveis.trago} valor={cva} alerta={alertaCva} />
          </>
        )}
        {pontosEditaveis.c7 && pontosEditaveis.acromio && (
          <>
            <LinhaSegmento a={pontosEditaveis.acromio} b={pontosEditaveis.c7} alerta={alertaOmbro} />
            <BadgeNaLinha a={pontosEditaveis.acromio} b={pontosEditaveis.c7} valor={anguloOmbro} alerta={alertaOmbro} />
          </>
        )}
        {Object.entries(pontosEditaveis).map(([id, p]) => (
          <MarcadorComLupa
            key={id}
            id={id}
            ponto={p}
            onMove={moverPonto}
            fotoUri={fotoUri}
            larguraImagem={IMAGE_WIDTH}
            alturaImagem={IMAGE_HEIGHT}
          />
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

      <Text style={styles.dicaArrastar}>Toque e arraste qualquer ponto na foto para corrigir a posicao. Os valores recalculam automaticamente.</Text>

      <TouchableOpacity style={styles.btnRestaurar} onPress={restaurarPontos}>
        <Text style={styles.btnRestaurarText}>Restaurar posicoes originais</Text>
      </TouchableOpacity>

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
  dicaArrastar: { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 16 },
  btnRestaurar: { backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  btnRestaurarText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
