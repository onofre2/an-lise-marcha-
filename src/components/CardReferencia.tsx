import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, ScrollView, Dimensions } from 'react-native';

// Cards antigos vivem numa imagem unica em grade 3x2 (tecnica de sprite).
// Cards novos usam arquivo proprio, que permite proporcao livre.
const SPRITE = require('../../assets/referencias/referencias-completo.png');
const COLUNAS = 3;
const LINHAS = 2;
const PROPORCAO_SPRITE = 1020 / 1527;

const CARD_ANTERIOR = require('../../assets/referencias/card-anterior.jpg');
const CARD_POSTERIOR = require('../../assets/referencias/card-posterior.jpg');
const CARD_MARCHA = require('../../assets/referencias/card-marcha.jpg');
const CARD_ADAMS = require('../../assets/referencias/teste-adams.jpg');

export type CardId = 'anterior' | 'posterior' | 'lateral' | 'cervical' | 'adm' | 'marcha' | 'adams';

type Config =
  | { tipo: 'sprite'; col: number; lin: number; titulo: string }
  | { tipo: 'arquivo'; fonte: any; proporcao: number; titulo: string };

const CARDS: Record<CardId, Config> = {
  anterior:  { tipo: 'arquivo', fonte: CARD_ANTERIOR, proporcao: 896 / 1200, titulo: 'Vista Anterior' },
  posterior: { tipo: 'arquivo', fonte: CARD_POSTERIOR, proporcao: 896 / 1200, titulo: 'Vista Posterior' },
  lateral:   { tipo: 'sprite', col: 2, lin: 0, titulo: 'Vista Lateral' },
  cervical:  { tipo: 'sprite', col: 0, lin: 1, titulo: 'Cervical' },
  adm:       { tipo: 'sprite', col: 1, lin: 1, titulo: 'Amplitude de Movimento' },
  marcha:    { tipo: 'arquivo', fonte: CARD_MARCHA, proporcao: 1376 / 768, titulo: 'Marcha' },
  adams:     { tipo: 'arquivo', fonte: CARD_ADAMS, proporcao: 700 / 450, titulo: 'Teste de Adams' },
};

export default function CardReferencia({ card }: { card: CardId }) {
  const [aberto, setAberto] = useState(false);
  const config = CARDS[card];

  const larguraTela = Dimensions.get('window').width;
  const larguraCard = larguraTela - 32;

  return (
    <>
      <TouchableOpacity style={styles.botao} onPress={() => setAberto(true)}>
        <Text style={styles.botaoText}>Ver referencias: {config.titulo}</Text>
      </TouchableOpacity>

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitulo}>{config.titulo}</Text>
            <TouchableOpacity onPress={() => setAberto(false)}>
              <Text style={styles.fechar}>Fechar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.scroll}>
            {config.tipo === 'sprite' ? (
              <JanelaSprite config={config} larguraCard={larguraCard} />
            ) : (
              <Image
                source={config.fonte}
                style={{ width: larguraCard, height: larguraCard / config.proporcao, borderRadius: 12 }}
                resizeMode="contain"
              />
            )}
            <Text style={styles.legenda}>
              Valores de referencia utilizados pelo aplicativo para identificar desajustes.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function JanelaSprite({ config, larguraCard }: { config: any; larguraCard: number }) {
  const larguraTotal = larguraCard * COLUNAS;
  const alturaTotal = larguraTotal / PROPORCAO_SPRITE;
  const alturaCard = alturaTotal / LINHAS;

  return (
    <View style={[styles.janela, { width: larguraCard, height: alturaCard }]}>
      <Image
        source={SPRITE}
        style={{
          width: larguraTotal,
          height: alturaTotal,
          marginLeft: -larguraCard * config.col,
          marginTop: -alturaCard * config.lin,
        }}
        resizeMode="stretch"
      />
    </View>
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
