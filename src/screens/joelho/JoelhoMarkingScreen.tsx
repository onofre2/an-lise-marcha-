import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import MarcadorComLupa from '../../components/MarcadorComLupa';
import { PONTOS_JOELHO, PONTOS_RETROPE, VistaJoelho } from '../../constants/joelhoPoints';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.55;
const IMAGE_WIDTH = Dimensions.get('window').width;

// Segmentos ligados por linha, na mesma ordem usada no calculo.
const SEGMENTOS_VISTA: Record<string, [string, string][]> = {
  anterior: [
    ['eias_d', 'patela_d'], ['patela_d', 'maleolo_d'],
    ['eias_e', 'patela_e'], ['patela_e', 'maleolo_e'],
  ],
  lateral_direita: [['trocanter', 'epicondilo'], ['epicondilo', 'maleolo']],
  lateral_esquerda: [['trocanter', 'epicondilo'], ['epicondilo', 'maleolo']],
  retrope: [
    ['base_d', 'insercao_d'], ['tendao_d', 'perna_d'],
    ['base_e', 'insercao_e'], ['tendao_e', 'perna_e'],
  ],
};

function LinhaSegmento({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const angulo = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View
      pointerEvents="none"
      style={[styles.linhaSegmento, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: `${angulo}deg` }] }]}
    />
  );
}

export default function JoelhoMarkingScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, vista } = route.params as {
    fotoUri: string; pacienteId: number; vista: string;
  };

  const sequencia = vista === 'retrope'
    ? PONTOS_RETROPE
    : (PONTOS_JOELHO[vista as VistaJoelho] || []);

  const [indiceAtual, setIndiceAtual] = useState(0);
  const [pontosMarcados, setPontosMarcados] = useState<Record<string, Ponto>>({});

  const pontoAtual = indiceAtual < sequencia.length ? sequencia[indiceAtual] : null;
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

  const voltarPonto = () => {
    if (indiceAtual === 0) return;
    const anteriorId = sequencia[indiceAtual - 1].id;
    setPontosMarcados(prev => {
      const copia = { ...prev };
      delete copia[anteriorId];
      return copia;
    });
    setIndiceAtual(prev => prev - 1);
  };

  const confirmar = () => {
    // Grava normalizado (0 a 1): a tela de resultado tem area diferente
    // desta, entao pixel cru sairia deslocado.
    const normalizado: Record<string, Ponto> = {};
    for (const [id, pt] of Object.entries(pontosMarcados)) {
      normalizado[id] = { x: pt.x / IMAGE_WIDTH, y: pt.y / IMAGE_HEIGHT };
    }
    navigation.navigate('JoelhoResult', { fotoUri, pacienteId, vista, pontos: normalizado });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {!finalizado ? (
          <Text style={styles.headerText}>Toque em: {pontoAtual!.nome}</Text>
        ) : (
          <Text style={styles.headerText}>Ajuste os pontos se necessario</Text>
        )}
        <View style={styles.progressoBadge}>
          <Text style={styles.progresso}>{Object.keys(pontosMarcados).length}/{sequencia.length}</Text>
        </View>
      </View>

      <TouchableOpacity activeOpacity={1} onPress={handleImagePress} style={styles.imageContainer}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {(SEGMENTOS_VISTA[vista] || []).map(([idA, idB], i) => {
          const a = pontosMarcados[idA];
          const b = pontosMarcados[idB];
          if (!a || !b) return null;
          return <LinhaSegmento key={`seg-${i}`} a={a} b={b} />;
        })}

        {Object.entries(pontosMarcados).map(([id, p]) => (
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
      </TouchableOpacity>

      {vista !== 'retrope' && (
        <View style={styles.apoio}>
          <Text style={styles.apoioTitulo}>Referencia visual</Text>
          <Image
            source={require('../../../assets/referencias/joelho-pontos.jpg')}
            style={styles.apoioImagem}
            resizeMode="contain"
          />
        </View>
      )}

      {vista !== 'retrope' && (
        <View style={styles.apoio}>
          <Text style={styles.apoioTitulo}>Referencia visual</Text>
          <Image
            source={require('../../../assets/referencias/joelho-pontos.jpg')}
            style={styles.apoioImagem}
            resizeMode="contain"
          />
        </View>
      )}

      {vista === 'retrope' && (
        <View style={styles.apoio}>
          <Text style={styles.apoioTitulo}>Referencia visual</Text>
          <Image
            source={require('../../../assets/referencias/retrope-pontos.jpg')}
            style={styles.apoioImagem}
            resizeMode="contain"
          />
        </View>
      )}

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
    </ScrollView>
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
  linhaSegmento: { position: 'absolute', height: 2.5, backgroundColor: '#4ADE80', transformOrigin: 'left' },
  apoio: { padding: 12, backgroundColor: '#FFFFFF', marginTop: 10 },
  apoioTitulo: { fontSize: 13, fontWeight: 'bold', color: '#64748B', marginBottom: 8 },
  apoioImagem: { width: '100%', height: 130, marginBottom: 8 },
  footer: { flexDirection: 'row', padding: 16, gap: 12 },
  btnSecundario: { flex: 1, backgroundColor: '#F1F5F9', padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnSecundarioText: { color: '#0F172A', fontWeight: 'bold' },
  btnPrimario: { flex: 2, backgroundColor: '#22C55E', padding: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimarioText: { color: '#FFF', fontWeight: 'bold' },
});
