import React from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

interface Ponto { x: number; y: number; }

/** Comprimento fixo da seta em pixels. Ela gira, mas nao estica. */
const COMPRIMENTO = 52;

/**
 * Seta de indicacao de desajuste. A base fica onde o terapeuta tocou e a ponta
 * pode ser arrastada para apontar a estrutura, sem cobrir a regiao observada.
 */
export default function SetaDesajuste({
  id, base, ponta, onMoverPonta, onMoverBase, onLongPress, curva = false,
}: {
  id: string;
  base: Ponto;
  ponta: Ponto;
  onMoverPonta: (id: string, x: number, y: number) => void;
  onMoverBase?: (id: string, x: number, y: number) => void;
  onLongPress?: (id: string) => void;
  curva?: boolean;
}) {
  const baseRef = React.useRef(base);
  baseRef.current = base;

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
        // A seta nao estica: o arrasto define apenas a direcao, e o comprimento
        // e normalizado de volta ao tamanho padrao.
        const alvoX = inicio.current.x + g.dx;
        const alvoY = inicio.current.y + g.dy;
        const vx = alvoX - baseRef.current.x;
        const vy = alvoY - baseRef.current.y;
        const dist = Math.sqrt(vx * vx + vy * vy) || 1;
        onMoverPonta(
          id,
          baseRef.current.x + (vx / dist) * COMPRIMENTO,
          baseRef.current.y + (vy / dist) * COMPRIMENTO,
        );
      },
    })
  ).current;

  const inicioBase = React.useRef({ x: 0, y: 0 });

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

  return (
    <>
      {curva ? (
        <View
          pointerEvents="none"
          style={[
            styles.hasteCurva,
            {
              left: base.x,
              top: base.y - comprimento,
              width: comprimento,
              height: comprimento,
              borderTopRightRadius: comprimento,
              transform: [{ rotate: `${angulo}deg` }],
            },
          ]}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[styles.haste, { left: base.x, top: base.y, width: comprimento, transform: [{ rotate: `${angulo}deg` }] }]}
        />
      )}
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
    </>
  );
}

const styles = StyleSheet.create({
  haste: { position: 'absolute', height: 1.5, backgroundColor: '#EF4444', transformOrigin: 'left' },
  hasteCurva: {
    position: 'absolute',
    borderColor: '#EF4444',
    borderTopWidth: 1.5,
    borderRightWidth: 1.5,
    transformOrigin: 'left bottom',
  },
  areaPonta: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  areaBase: { position: 'absolute', width: 48, height: 48 },
  triangulo: {
    width: 0, height: 0, backgroundColor: 'transparent',
    borderTopWidth: 3, borderBottomWidth: 3, borderLeftWidth: 6,
    borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: '#EF4444',
  },
});
