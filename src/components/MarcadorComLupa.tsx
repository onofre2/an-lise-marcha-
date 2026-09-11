import React, { useState } from 'react';
import { View, Text, Image, PanResponder, StyleSheet } from 'react-native';

interface Ponto { x: number; y: number; }

const ZOOM = 2.5;
const LUPA_DIAMETRO = 110;

export default function MarcadorComLupa({
  id, ponto, onMove, fotoUri, larguraImagem, alturaImagem, cor = '#22C55E', onLongPress, tamanho = 16, rotulo,
}: {
  id: string;
  ponto: Ponto;
  onMove: (id: string, x: number, y: number) => void;
  fotoUri: string;
  larguraImagem: number;
  alturaImagem: number;
  cor?: string;
  onLongPress?: (id: string) => void;
  tamanho?: number;
  rotulo?: string;
}) {
  const pontoRef = React.useRef(ponto);
  pontoRef.current = ponto;
  const startPos = React.useRef({ x: 0, y: 0 });
  const [arrastando, setArrastando] = useState(false);
  const tempoToque = React.useRef<number | null>(null);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPos.current = { x: pontoRef.current.x, y: pontoRef.current.y };
        tempoToque.current = Date.now();
        setArrastando(true);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (Math.abs(gestureState.dx) <= 4 && Math.abs(gestureState.dy) <= 4) return;
        onMove(id, startPos.current.x + gestureState.dx, startPos.current.y + gestureState.dy);
      },
      onPanResponderRelease: () => setArrastando(false),
      onPanResponderTerminate: () => setArrastando(false),
    })
  ).current;

  // A lupa fica ao lado do ponto, nunca sob o dedo. Se o ponto estiver na
  // metade direita da imagem, ela espelha para a esquerda para nao sair da tela.
  const AFASTAMENTO = 40;
  const aDireita = ponto.x < larguraImagem / 2;
  const lupaLeftBruto = aDireita
    ? ponto.x + AFASTAMENTO
    : ponto.x - AFASTAMENTO - LUPA_DIAMETRO;
  const lupaLeft = Math.min(Math.max(lupaLeftBruto, 4), larguraImagem - LUPA_DIAMETRO - 4);
  const lupaTop = Math.min(Math.max(ponto.y - LUPA_DIAMETRO / 2, 4), alturaImagem - LUPA_DIAMETRO - 4);

  return (
    <>
      <View {...panResponder.panHandlers} onTouchEnd={() => { if (tempoToque.current && Date.now() - tempoToque.current > 600 && onLongPress) onLongPress(id); }} style={[styles.marcador, { left: ponto.x - tamanho / 2, top: ponto.y - tamanho / 2, width: tamanho, height: tamanho, borderRadius: tamanho / 2, borderColor: cor }]} />
      {rotulo ? (
        <Text pointerEvents="none" style={[styles.rotulo, { left: ponto.x + tamanho / 2 + 4, top: ponto.y - 7, color: cor }]}>{rotulo}</Text>
      ) : null}
      {arrastando && (
        <View pointerEvents="none" style={[styles.lupa, { left: lupaLeft, top: lupaTop }]}>
          <Image
            source={{ uri: fotoUri }}
            style={{
              width: larguraImagem * ZOOM,
              height: alturaImagem * ZOOM,
              marginLeft: -(ponto.x * ZOOM - LUPA_DIAMETRO / 2),
              marginTop: -(ponto.y * ZOOM - LUPA_DIAMETRO / 2),
            }}
            resizeMode="contain"
          />
          <View style={styles.mira} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  rotulo: { position: 'absolute', fontSize: 9, fontWeight: '700' },
  marcador: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: 'transparent', borderWidth: 2, borderColor: '#22C55E' },
  lupa: {
    position: 'absolute',
    width: LUPA_DIAMETRO,
    height: LUPA_DIAMETRO,
    borderRadius: LUPA_DIAMETRO / 2,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#22C55E',
    backgroundColor: '#000',
  },
  mira: {
    position: 'absolute',
    left: LUPA_DIAMETRO / 2 - 5,
    top: LUPA_DIAMETRO / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
});
