import React from 'react';
import { View, Image, StyleSheet, PanResponder, TouchableOpacity, Text } from 'react-native';

export default function RadiografiaComPrumo({
  uri, x, largura, altura, onMover, onRemover,
}: {
  uri: string;
  x: number;
  largura: number;
  altura: number;
  onMover: (x: number) => void;
  onRemover?: () => void;
}) {
  const inicio = React.useRef(0);
  const xRef = React.useRef(x);
  xRef.current = x;

  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        inicio.current = xRef.current;
      },
      onPanResponderMove: (evt, g) => {
        const novo = inicio.current + g.dx / largura;
        onMover(Math.min(Math.max(novo, 0), 1));
      },
    })
  ).current;

  const esquerda = x * largura;

  return (
    <View style={[styles.area, { width: largura, height: altura }]}>
      <Image source={{ uri }} style={styles.imagem} resizeMode="contain" />
      <View pointerEvents="none" style={[styles.linha, { left: esquerda }]} />
      <View {...pan.panHandlers} style={[styles.alca, { left: esquerda - 28 }]} hitSlop={{ top: 0, bottom: 0, left: 12, right: 12 }} />
      {onRemover && (
        <TouchableOpacity style={styles.btnRemover} onPress={onRemover}>
          <Text style={styles.btnRemoverTexto}>Remover</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  area: { backgroundColor: '#000', borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  imagem: { width: '100%', height: '100%' },
  linha: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#22C55E', zIndex: 10 },
  alca: { position: 'absolute', top: 0, bottom: 0, width: 56, zIndex: 20 },
  btnRemover: { position: 'absolute', top: 8, right: 8, zIndex: 30, backgroundColor: 'rgba(15,23,42,0.75)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  btnRemoverTexto: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
});
