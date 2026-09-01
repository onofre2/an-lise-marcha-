import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, PanResponder, Dimensions } from 'react-native';
import { PONTOS_RAPIDA, Vista } from '../../constants/posturalPoints';
import CardReferencia, { CardId } from '../../components/CardReferencia';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.62;

export default function PosturalMarkingScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, vista, modo } = route.params as {
    fotoUri: string; pacienteId: number; vista: Vista; modo: 'rapida' | 'completa';
  };

  const pontosSequencia = PONTOS_RAPIDA[vista];
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pontosMarcados, setPontosMarcados] = useState<Record<string, Ponto>>({});

  const pontoAtual = indiceAtual < pontosSequencia.length ? pontosSequencia[indiceAtual] : null;
  const finalizado = pontoAtual === null;

  const handleImagePress = (evt: any) => {
    if (finalizado) return;
    const { locationX, locationY } = evt.nativeEvent;
    setPontosMarcados(prev => ({ ...prev, [pontoAtual!.id]: { x: locationX, y: locationY } }));
    setIndiceAtual(prev => prev + 1);
  };

  const moverPonto = (id: string, x: number, y: number) => {
    setPontosMarcados(prev => ({ ...prev, [id]: { x, y } }));
  };

  const reiniciar = () => {
    setPontosMarcados({});
    setIndiceAtual(0);
  };

  const confirmar = () => {
    navigation.navigate('PosturalResult', { fotoUri, pacienteId, vista, modo, pontos: pontosMarcados });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!finalizado ? (
          <Text style={styles.headerText}>Toque em: {pontoAtual!.nome}</Text>
        ) : (
          <Text style={styles.headerText}>Ajuste os pontos se necessário</Text>
        )}
        <View style={styles.progressoBadge}>
          <Text style={styles.progresso}>{Object.keys(pontosMarcados).length}/{pontosSequencia.length}</Text>
        </View>
      </View>

      <CardReferencia card={(vista === 'anterior' ? 'anterior' : vista === 'posterior' ? 'posterior' : 'lateral') as CardId} />

      <TouchableOpacity activeOpacity={1} onPress={handleImagePress} style={styles.imageContainer}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {Object.entries(pontosMarcados).map(([id, p]) => (
          <MarcadorArrastavel key={id} id={id} ponto={p} onMove={moverPonto} />
        ))}
      </TouchableOpacity>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnSecundario} onPress={reiniciar}>
          <Text style={styles.btnSecundarioText}>Reiniciar</Text>
        </TouchableOpacity>
        {finalizado && (
          <TouchableOpacity style={styles.btnPrimario} onPress={confirmar}>
            <Text style={styles.btnPrimarioText}>Confirmar e Calcular</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MarcadorArrastavel({ id, ponto, onMove }: { id: string; ponto: Ponto; onMove: (id: string, x: number, y: number) => void }) {
  const pontoRef = React.useRef(ponto);
  pontoRef.current = ponto;
  const startPos = React.useRef({ x: 0, y: 0 });

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPos.current = { x: pontoRef.current.x, y: pontoRef.current.y };
      },
      onPanResponderMove: (evt, gestureState) => {
        onMove(id, startPos.current.x + gestureState.dx, startPos.current.y + gestureState.dy);
      },
    })
  ).current;

  return <View {...panResponder.panHandlers} style={[styles.marcador, { left: ponto.x - 12, top: ponto.y - 12 }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerText: { color: '#0F172A', fontWeight: 'bold', fontSize: 15, flex: 1 },
  progressoBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  progresso: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000' },
  image: { width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 24, height: 24, borderRadius: 12, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' },
  footer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#F8FAFC' },
  btnSecundario: { flex: 1, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnSecundarioText: { color: '#0F172A', fontWeight: 'bold' },
  btnPrimario: { flex: 2, backgroundColor: '#22C55E', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimarioText: { color: '#FFF', fontWeight: 'bold' },
});
