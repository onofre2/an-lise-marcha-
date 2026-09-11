import React from 'react';
import { View, Text, StyleSheet, PanResponder } from 'react-native';

interface Ponto { x: number; y: number; }

/**
 * Seta de indicacao de desajuste. A base fica onde o terapeuta tocou e a ponta
 * pode ser arrastada para apontar a estrutura, sem cobrir a regiao observada.
 */
export default function SetaDesajuste({
  id, base, ponta, onMoverPonta, onMoverBase, onLongPress, rotulo = 'desajuste',
}: {
  id: string;
  base: Ponto;
  ponta: Ponto;
  onMoverPonta: (id: string, x: number, y: number) => void;
  onMoverBase?: (id: string, x: number, y: number) => void;
  onLongPress?: (id: string) => void;
  rotulo?: string;
}) {
  const inicio = React.useRef({ x: 0, y: 0 });
  const tempoToque = React.useRef<number | null>(null);
  const pontaRef = React.useRef(ponta);
  pontaRef.current = ponta;

  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        inicio.current = { x: pontaRef.current.x, y: pontaRef.current.y };
        tempoToque.current = Date.now();
      },
      onPanResponderMove: (evt, g) => {
        if (Math.abs(g.dx) <= 1 && Math.abs(g.dy) <= 1) return;
        onMoverPonta(id, inicio.current.x + g.dx, inicio.current.y + g.dy);
      },
    })
  ).current;

  const inicioBase = React.useRef({ x: 0, y: 0 });
  const baseRef = React.useRef(base);
  baseRef.current = base;

  const panBase = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        inicioBase.current = { x: baseRef.current.x, y: baseRef.current.y };
      },
      onPanResponderMove: (evt, g) => {
        if (Math.abs(g.dx) <= 1 && Math.abs(g.dy) <= 1) return;
        if (onMoverBase) onMoverBase(id, inicioBase.current.x + g.dx, inicioBase.current.y + g.dy);
      },
    })
  ).current;

  const dx = ponta.x - base.x;
  const dy = ponta.y - base.y;
  const comprimento = Math.sqrt(dx * dx + dy * dy);
  const angulo = Math.atan2(dy, dx) * (180 / Math.PI);
  const rotuloAEsquerda = dx > 0;

  return (
    <>
      <View
        pointerEvents="none"
        style={[styles.haste, { left: base.x, top: base.y, width: comprimento, transform: [{ rotate: `${angulo}deg` }] }]}
      />
      <View
        {...pan.panHandlers}
        onTouchEnd={() => {
          if (tempoToque.current && Date.now() - tempoToque.current > 600 && onLongPress) onLongPress(id);
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.areaPonta, { left: ponta.x - 24, top: ponta.y - 24 }]}
      >
        <View style={[styles.triangulo, { transform: [{ rotate: `${angulo}deg` }] }]} />
      </View>
      <View {...panBase.panHandlers} style={[styles.areaBase, { left: base.x - 24, top: base.y - 24 }]} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} />
      <Text
        pointerEvents="none"
        style={[
          styles.rotulo,
          rotuloAEsquerda ? { left: base.x - 42 } : { left: base.x + 5 },
          { top: base.y - 7 },
        ]}
      >
        {rotulo}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  haste: { position: 'absolute', height: 1.5, backgroundColor: '#EF4444', transformOrigin: 'left' },
  areaPonta: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  areaBase: { position: 'absolute', width: 48, height: 48 },
  triangulo: {
    width: 0, height: 0, backgroundColor: 'transparent',
    borderTopWidth: 3, borderBottomWidth: 3, borderLeftWidth: 6,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#EF4444',
  },
  rotulo: { position: 'absolute', fontSize: 7, fontWeight: '700', color: '#EF4444', width: 38, textAlign: 'center' },
});
