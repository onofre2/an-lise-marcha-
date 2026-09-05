import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Orientacao = 'frontal' | 'lateral';

/**
 * Guia esquematico sobreposto a camera para padronizar o enquadramento
 * do paciente entre avaliacoes. Nao interfere na captura - e apenas visual.
 */
export default function SilhuetaGuia({ orientacao = 'frontal' }: { orientacao?: Orientacao }) {
  const ehLateral = orientacao === 'lateral';

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Cabeca */}
      <View style={styles.cabeca} />

      {/* Linha dos ombros */}
      <View style={styles.linhaReferencia}>
        <Text style={styles.rotulo}>ombros</Text>
      </View>

      {/* Tronco */}
      <View style={[styles.tronco, ehLateral && styles.troncoLateral]} />

      {/* Linha do quadril */}
      <View style={styles.linhaReferencia}>
        <Text style={styles.rotulo}>quadril</Text>
      </View>

      {/* Pernas */}
      <View style={[styles.pernas, ehLateral && styles.pernasLateral]} />

      {/* Linha dos pes */}
      <View style={styles.linhaReferencia}>
        <Text style={styles.rotulo}>pes</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 30,
  },
  cabeca: {
    width: 52,
    height: 62,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.55)',
    borderStyle: 'dashed',
  },
  tronco: {
    width: 110,
    height: 130,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.55)',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  troncoLateral: { width: 70 },
  pernas: {
    width: 84,
    height: 150,
    borderWidth: 2,
    borderColor: 'rgba(34,197,94,0.55)',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  pernasLateral: { width: 58 },
  linhaReferencia: {
    width: '82%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.35)',
    alignItems: 'flex-end',
  },
  rotulo: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    marginTop: 2,
  },
});
