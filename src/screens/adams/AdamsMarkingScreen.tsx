import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import MarcadorComLupa from '../../components/MarcadorComLupa';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.62;
const IMAGE_WIDTH = Dimensions.get('window').width;

// Vista posterior: compara a altura das gibosidades entre os lados.
// Vista lateral: mede o quanto o apice se projeta alem da linha C7-L5.
const SEQUENCIAS = {
  posterior: [
    { id: 'dorso_d', nome: 'Gibosidade DIREITA: ponto mais proeminente do dorso' },
    { id: 'dorso_e', nome: 'Lado ESQUERDO: mesma altura da coluna, no lado oposto' },
  ],
  lateral: [
    { id: 'c7', nome: 'C7: base do pescoco, vertebra mais saliente' },
    { id: 'apice', nome: 'Apice da gibosidade: ponto mais alto do dorso' },
    { id: 'l5', nome: 'L5: base da coluna lombar' },
  ],
};

export default function AdamsMarkingScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, vista = 'posterior' } = route.params as {
    fotoUri: string; pacienteId: number; vista?: 'posterior' | 'lateral';
  };
  const PONTOS_SEQUENCIA = SEQUENCIAS[vista];

  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pontosMarcados, setPontosMarcados] = useState<Record<string, Ponto>>({});

  const pontoAtual = indiceAtual < PONTOS_SEQUENCIA.length ? PONTOS_SEQUENCIA[indiceAtual] : null;
  const finalizado = pontoAtual === null;

  const handleImagePress = (evt: any) => {
    if (finalizado) return;
    const { locationX, locationY } = evt.nativeEvent;
    // Normalizado (0 a 1): a coordenada passa a valer em qualquer tamanho de
    // tela e no relatorio, sem depender da area onde foi marcada.
    setPontosMarcados(prev => ({
      ...prev,
      [pontoAtual!.id]: { x: locationX / IMAGE_WIDTH, y: locationY / IMAGE_HEIGHT },
    }));
    setIndiceAtual(prev => prev + 1);
  };

  const moverPonto = (id: string, x: number, y: number) => {
    const nx = Math.min(Math.max(x / IMAGE_WIDTH, 0), 1);
    const ny = Math.min(Math.max(y / IMAGE_HEIGHT, 0), 1);
    setPontosMarcados(prev => ({ ...prev, [id]: { x: nx, y: ny } }));
  };

  const reiniciar = () => {
    setPontosMarcados({});
    setIndiceAtual(0);
  };

  const voltarPonto = () => {
    if (indiceAtual === 0) return;
    const anteriorId = PONTOS_SEQUENCIA[indiceAtual - 1].id;
    setPontosMarcados(prev => {
      const copia = { ...prev };
      delete copia[anteriorId];
      return copia;
    });
    setIndiceAtual(prev => prev - 1);
  };

  const confirmar = () => {
    navigation.navigate('AdamsResult', { fotoUri, pacienteId, vista, pontos: pontosMarcados });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!finalizado ? (
          <Text style={styles.headerText}>Toque em: {pontoAtual!.nome}</Text>
        ) : (
          <Text style={styles.headerText}>Ajuste os pontos se necessario</Text>
        )}
        <View style={styles.progressoBadge}>
          <Text style={styles.progresso}>{Object.keys(pontosMarcados).length}/{PONTOS_SEQUENCIA.length}</Text>
        </View>
      </View>

      <TouchableOpacity activeOpacity={1} onPress={handleImagePress} style={styles.imageContainer}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {Object.entries(pontosMarcados).map(([id, p]) => (
          <MarcadorComLupa
            key={id}
            id={id}
            ponto={{ x: p.x * IMAGE_WIDTH, y: p.y * IMAGE_HEIGHT }}
            onMove={moverPonto}
            fotoUri={fotoUri}
            larguraImagem={IMAGE_WIDTH}
            alturaImagem={IMAGE_HEIGHT}
          />
        ))}
      </TouchableOpacity>

      <View style={styles.footer}>
        {indiceAtual > 0 && !finalizado && (
          <TouchableOpacity style={styles.btnSecundario} onPress={voltarPonto}>
            <Text style={styles.btnSecundarioText}>Voltar</Text>
          </TouchableOpacity>
        )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerText: { color: '#0F172A', fontWeight: 'bold', fontSize: 14, flex: 1 },
  progressoBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  progresso: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000' },
  image: { width: '100%', height: '100%' },
  footer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#F8FAFC' },
  btnSecundario: { flex: 1, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnSecundarioText: { color: '#0F172A', fontWeight: 'bold' },
  btnPrimario: { flex: 2, backgroundColor: '#22C55E', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimarioText: { color: '#FFF', fontWeight: 'bold' },
});
