import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, PanResponder, Dimensions } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const AREA_W = Dimensions.get('window').width;
const AREA_H = Dimensions.get('window').height * 0.62;

export default function PosturalFramingScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, vista, modo } = route.params;

  const [escala, setEscala] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [processando, setProcessando] = useState(false);

  const base = useRef({ escala: 1, x: 0, y: 0, dist: 0 });

  const dist = (t: any[]) =>
    Math.sqrt((t[0].pageX - t[1].pageX) ** 2 + (t[0].pageY - t[1].pageY) ** 2);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const t = evt.nativeEvent.touches;
        base.current = {
          escala,
          x: offset.x,
          y: offset.y,
          dist: t.length >= 2 ? dist(t as any) : 0,
        };
      },
      onPanResponderMove: (evt, g) => {
        const t = evt.nativeEvent.touches;
        if (t.length >= 2 && base.current.dist > 0) {
          const nova = (dist(t as any) / base.current.dist) * base.current.escala;
          setEscala(Math.min(Math.max(nova, 1), 4));
        } else if (t.length === 1) {
          setOffset({ x: base.current.x + g.dx, y: base.current.y + g.dy });
        }
      },
    })
  ).current;

  const confirmar = async () => {
    if (processando) return;
    setProcessando(true);
    try {
      const info = await ImageManipulator.manipulateAsync(fotoUri, [], {});
      const larguraVisivel = info.width / escala;
      const alturaVisivel = info.height / escala;
      const fatorX = info.width / AREA_W;
      const fatorY = info.height / AREA_H;
      const originX = Math.min(
        Math.max(info.width / 2 - larguraVisivel / 2 - offset.x * fatorX, 0),
        Math.max(info.width - larguraVisivel, 0)
      );
      const originY = Math.min(
        Math.max(info.height / 2 - alturaVisivel / 2 - offset.y * fatorY, 0),
        Math.max(info.height - alturaVisivel, 0)
      );
      const recortada = await ImageManipulator.manipulateAsync(
        fotoUri,
        [{ crop: { originX, originY, width: larguraVisivel, height: alturaVisivel } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      navigation.replace('PosturalMarking', { fotoUri: recortada.uri, pacienteId, vista, modo });
    } catch (error) {
      console.error('Erro ao enquadrar:', error);
      navigation.replace('PosturalMarking', { fotoUri, pacienteId, vista, modo });
    }
  };

  const resetar = () => {
    setEscala(1);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Ajuste o enquadramento</Text>
        <Text style={styles.headerSub}>Dois dedos para ampliar, um dedo para mover</Text>
      </View>

      <View style={styles.area} {...pan.panHandlers}>
        <Image
          source={{ uri: fotoUri }}
          style={[
            styles.imagem,
            { transform: [{ translateX: offset.x }, { translateY: offset.y }, { scale: escala }] },
          ]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btnSecundario} onPress={resetar}>
          <Text style={styles.btnSecundarioText}>Restaurar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={confirmar} disabled={processando}>
          <Text style={styles.btnText}>{processando ? 'Processando...' : 'Confirmar'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 12 },
  headerText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  area: { width: AREA_W, height: AREA_H, backgroundColor: '#000', overflow: 'hidden' },
  imagem: { width: AREA_W, height: AREA_H },
  footer: { flexDirection: 'row', gap: 12, padding: 20 },
  btn: { flex: 1, backgroundColor: '#22C55E', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  btnSecundario: { flex: 1, backgroundColor: '#334155', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnSecundarioText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
});
