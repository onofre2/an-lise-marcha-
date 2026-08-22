import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';

// A imagem de referencias e uma grade de 3 colunas por 2 linhas.
// Em vez de recortar em 6 arquivos, ampliamos a imagem e deslocamos
// para exibir apenas o card desejado (tecnica de sprite).
const IMG = require('../../assets/referencias/referencias-completo.png');
const COLUNAS = 3;
const LINHAS = 2;
const PROPORCAO = 1020 / 1527;

export type CardId = 'anterior' | 'posterior' | 'lateral' | 'cervical' | 'adm' | 'marcha';

const POSICOES: Record<CardId, { col: number; lin: number; titulo: string }> = {
  anterior:  { col: 0, lin: 0, titulo: 'Vista Anterior' },
  posterior: { col: 1, lin: 0, titulo: 'Vista Posterior' },
  lateral:   { col: 2, lin: 0, titulo: 'Vista Lateral' },
  cervical:  { col: 0, lin: 1, titulo: 'Cervical' },
  adm:       { col: 1, lin: 1, titulo: 'Amplitude de Movimento' },
  marcha:    { col: 2, lin: 1, titulo: 'Marcha' },
};

export default function CardReferencia({ card }: { card: CardId }) {
  const [aberto, setAberto] = useState(false);
  const pos = POSICOES[card];

  const larguraTela = Dimensions.get('window').width;
  const larguraCard = larguraTela - 32;
  const larguraTotal = larguraCard * COLUNAS;
  const alturaTotal = larguraTotal / PROPORCAO;
  const alturaCard = alturaTotal / LINHAS;

  return (
    <>
      <TouchableOpacity style={styles.botao} onPress={() => setAberto(true)}>
        <Text style={styles.botaoText}>Ver referencias: {pos.titulo}</Text>
      </TouchableOpacity>

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitulo}>{pos.titulo}</Text>
            <TouchableOpacity onPress={() => setAberto(false)}>
              <Text style={styles.fechar}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={[styles.janela, { width: larguraCard, height: alturaCard }]}>
              <Image
                source={IMG}
                style={{
                  width: larguraTotal,
                  height: alturaTotal,
                  marginLeft: -larguraCard * pos.col,
                  marginTop: -alturaCard * pos.lin,
                }}
                resizeMode="stretch"
              />
            </View>
            <Text style={styles.legenda}>
              Valores de referencia utilizados pelo aplicativo para identificar desajustes.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  botao: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 12 },
  botaoText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  modal: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitulo: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  fechar: { color: '#16A34A', fontWeight: 'bold', fontSize: 14 },
  scroll: { padding: 16, alignItems: 'center' },
  janela: { overflow: 'hidden', borderRadius: 12, backgroundColor: '#0F172A' },
  legenda: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 14, lineHeight: 17 },
});
