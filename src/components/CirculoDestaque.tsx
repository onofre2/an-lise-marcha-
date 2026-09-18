import React from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

interface Ponto { x: number; y: number; }

/** Tamanho medio padrao do circulo, em pixels. */
export const RAIO_PADRAO = 46;

/**
 * Circulo de destaque arrastavel. Marca uma regiao da imagem sem cobri-la:
 * so o contorno e desenhado. O tamanho e ajustavel com dois dedos.
 */
export default function CirculoDestaque({
  id, centro, raio, onMover, onRedimensionar, onLongPress,
}: {
  id: string;
  centro: Ponto;
  raio: number;
  onMover: (id: string, x: number, y: number) => void;
  onRedimensionar?: (id: string, raio: number) => void;
  onLongPress?: (id: string) => void;
}) {
  const inicio = React.useRef({ x: 0, y: 0 });
  const raioInicial = React.useRef(raio);
  const distanciaInicial = React.useRef(0);
  const tempoToque = React.useRef<number | null>(null);

  const centroRef = React.useRef(centro);
  centroRef.current = centro;
  const raioRef = React.useRef(raio);
  raioRef.current = raio;

  function distanciaEntreDedos(evt: any): number {
    const t = evt.nativeEvent.touches;
    if (t.length < 2) return 0;
    const dx = t[0].pageX - t[1].pageX;
    const dy = t[0].pageY - t[1].pageY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        inicio.current = { x: centroRef.current.x, y: centroRef.current.y };
        raioInicial.current = raioRef.current;
        distanciaInicial.current = distanciaEntreDedos(evt);
        tempoToque.current = Date.now();
      },
      onPanResponderMove: (evt, g) => {
        const dedos = evt.nativeEvent.touches.length;

        // Dois dedos redimensionam; um dedo arrasta.
        if (dedos >= 2 && onRedimensionar) {
          const atual = distanciaEntreDedos(evt);
          if (distanciaInicial.current > 0 && atual > 0) {
            const fator = atual / distanciaInicial.current;
            const novo = Math.min(Math.max(raioInicial.current * fator, 18), 160);
            onRedimensionar(id, novo);
          }
          return;
        }

        if (Math.abs(g.dx) <= 1 && Math.abs(g.dy) <= 1) return;
        onMover(id, inicio.current.x + g.dx, inicio.current.y + g.dy);
      },
    })
  ).current;

  return (
    <View
      {...pan.panHandlers}
      onTouchEnd={() => {
        if (tempoToque.current && Date.now() - tempoToque.current > 600 && onLongPress) {
          onLongPress(id);
        }
      }}
      style={[
        styles.circulo,
        {
          left: centro.x - raio,
          top: centro.y - raio,
          width: raio * 2,
          height: raio * 2,
          borderRadius: raio,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  circulo: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#EF4444',
    backgroundColor: 'transparent',
    zIndex: 15,
  },
});
