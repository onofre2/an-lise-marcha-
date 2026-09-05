import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import db from '../../services/database';
import { salvarMidiaPermanente } from '../../services/armazenamento';
import { gerarRelatorioAdams } from '../../services/pdfService';
import MarcadorComLupa from '../../components/MarcadorComLupa';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 32;

// Limiar de alerta em graus. Mesmo criterio dos demais alinhamentos do app.
const LIMIAR = 5;

export default function AdamsResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, pontos } = route.params as {
    fotoUri: string; pacienteId: number; pontos: Record<string, Ponto>;
  };

  const [pontosEditaveis, setPontosEditaveis] = useState<Record<string, Ponto>>(pontos);
  const [observacoes, setObservacoes] = useState<Record<string, Ponto>>({});
  const [modoObservacao, setModoObservacao] = useState(false);

  const moverPonto = (id: string, x: number, y: number) => {
    setPontosEditaveis(prev => ({ ...prev, [id]: { x, y } }));
  };

  const restaurarPontos = () => setPontosEditaveis(pontos);

  const adicionarObservacao = (evt: any) => {
    if (!modoObservacao) return;
    const { locationX, locationY } = evt.nativeEvent;
    const novoId = `obs_${Date.now()}`;
    setObservacoes(prev => ({ ...prev, [novoId]: { x: locationX, y: locationY } }));
  };

  const moverObservacao = (id: string, x: number, y: number) => {
    setObservacoes(prev => ({ ...prev, [id]: { x, y } }));
  };

  const removerObservacao = (id: string) => {
    setObservacoes(prev => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  // Angulo de inclinacao entre os dois lados do dorso, em relacao a horizontal
  const resultado = useMemo(() => {
    const d = pontosEditaveis.dorso_d;
    const e = pontosEditaveis.dorso_e;
    if (!d || !e) return null;

    const dx = Math.abs(e.x - d.x);
    const dy = Math.abs(e.y - d.y);
    if (dx === 0) return null;

    const angulo = Number((Math.atan2(dy, dx) * (180 / Math.PI)).toFixed(1));
    // No eixo da tela, y menor significa mais alto na imagem
    const ladoElevado = d.y < e.y ? 'Direito' : 'Esquerdo';

    return { angulo, ladoElevado, alerta: angulo >= LIMIAR };
  }, [pontosEditaveis]);

  const salvarAvaliacao = async () => {
    if (!resultado) {
      Alert.alert('Erro', 'Marque os dois pontos antes de salvar.');
      return;
    }
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const fotoPermanente = await salvarMidiaPermanente(fotoUri);
      db.runSync(
        'INSERT INTO avaliacoes_adams (id_paciente, data_avaliacao, foto_uri, pontos_json, angulo, lado_elevado, observacoes_json, dimensoes_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [pacienteId, dataHoje, fotoPermanente, JSON.stringify(pontosEditaveis), resultado.angulo, resultado.ladoElevado, JSON.stringify(observacoes), JSON.stringify({ largura: IMAGE_WIDTH, altura: IMAGE_HEIGHT })]
      );
      const nova = db.getFirstSync('SELECT last_insert_rowid() as id') as { id: number };
      Alert.alert('Sucesso', 'Avaliacao salva! Deseja gerar o relatorio em PDF?', [
        { text: 'Agora nao', onPress: () => navigation.navigate('AdamsHome') },
        {
          text: 'Gerar PDF',
          onPress: async () => {
            try {
              await gerarRelatorioAdams(nova.id);
            } catch (e) {
              Alert.alert('Erro', 'Nao foi possivel gerar o PDF.');
            }
            navigation.navigate('AdamsHome');
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar teste de Adams:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a avaliacao.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {resultado && (
        <View style={[styles.resumoCard, resultado.alerta ? styles.resumoAlerta : styles.resumoOk]}>
          <Text style={[styles.resumoTexto, resultado.alerta ? styles.resumoTextoAlerta : styles.resumoTextoOk]}>
            {resultado.alerta
              ? `Assimetria observada no teste de inclinacao: gibosidade a ${resultado.ladoElevado.toLowerCase()} (${resultado.angulo}\u00b0). Recomenda-se avaliacao clinica complementar.`
              : `Sem assimetria significativa no teste de inclinacao (${resultado.angulo}\u00b0).`}
          </Text>
        </View>
      )}

      <View style={styles.imageContainer} onStartShouldSetResponder={() => modoObservacao} onResponderRelease={adicionarObservacao}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />

        {pontosEditaveis.dorso_d && pontosEditaveis.dorso_e && (
          <>
            <LinhaReferencia a={pontosEditaveis.dorso_d} b={pontosEditaveis.dorso_e} />
            <LinhaDorso a={pontosEditaveis.dorso_d} b={pontosEditaveis.dorso_e} alerta={resultado ? resultado.alerta : false} />
            {resultado && (
              <BadgeNaLinha
                a={pontosEditaveis.dorso_d}
                b={pontosEditaveis.dorso_e}
                valor={resultado.angulo}
                alerta={resultado.alerta}
              />
            )}
          </>
        )}

        {Object.entries(pontosEditaveis).map(([id, p]) => (
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

        {Object.entries(observacoes).map(([id, p]) => (
          <MarcadorComLupa
            key={id}
            id={id}
            ponto={p}
            onMove={moverObservacao}
            onLongPress={removerObservacao}
            cor="#EF4444"
            fotoUri={fotoUri}
            larguraImagem={IMAGE_WIDTH}
            alturaImagem={IMAGE_HEIGHT}
          />
        ))}
      </View>

      <Text style={styles.sectionTitle}>Resultado</Text>
      {!resultado ? (
        <Text style={styles.semDados}>Marque os dois pontos para calcular.</Text>
      ) : (
        <>
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Inclinacao entre os lados</Text>
              <Text style={styles.cardRef}>Alerta a partir de {LIMIAR} graus</Text>
            </View>
            <View style={[styles.badge, resultado.alerta ? styles.badgeAlerta : styles.badgeOk]}>
              <Text style={[styles.badgeText, resultado.alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{resultado.angulo}&deg;</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Lado mais elevado</Text>
            <View style={[styles.badge, styles.badgeNeutro]}>
              <Text style={[styles.badgeText, styles.badgeTextNeutro]}>{resultado.ladoElevado}</Text>
            </View>
          </View>
        </>
      )}

      <TouchableOpacity
        style={[styles.btnObservacao, modoObservacao && styles.btnObservacaoAtivo]}
        onPress={() => setModoObservacao(!modoObservacao)}
      >
        <Text style={[styles.btnObservacaoText, modoObservacao && styles.btnObservacaoTextAtivo]}>
          {modoObservacao ? 'Modo observacao ativo - toque na foto' : 'Marcar observacao'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.dicaArrastar}>Toque e arraste os pontos para corrigir. O angulo recalcula automaticamente.</Text>

      <TouchableOpacity style={styles.btnRestaurar} onPress={restaurarPontos}>
        <Text style={styles.btnRestaurarText}>Restaurar posicoes originais</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSalvar} onPress={salvarAvaliacao}>
        <Text style={styles.btnSalvarText}>Salvar no Historico do Paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function LinhaDorso({ a, b, alerta }: { a: Ponto; b: Ponto; alerta: boolean }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View style={[styles.linha, alerta ? styles.linhaAlerta : styles.linhaOk, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: ang + 'deg' }] }]} />
  );
}

function LinhaReferencia({ a, b }: { a: Ponto; b: Ponto }) {
  const yMedio = (a.y + b.y) / 2;
  const esquerda = Math.min(a.x, b.x) - 20;
  const largura = Math.abs(b.x - a.x) + 40;
  return (
    <View style={[styles.linhaRef, { left: esquerda, top: yMedio, width: largura }]} />
  );
}

function BadgeNaLinha({ a, b, valor, alerta }: { a: Ponto; b: Ponto; valor: number; alerta: boolean }) {
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  return (
    <View style={[styles.badgeFlutuante, alerta ? styles.badgeAlerta : styles.badgeOk, { left: x - 22, top: y - 30 }]}>
      <Text style={[styles.badgeFlutuanteTexto, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{valor}&deg;</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  resumoCard: { padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  resumoOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  resumoAlerta: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  resumoTexto: { fontSize: 13, lineHeight: 19 },
  resumoTextoOk: { color: '#166534' },
  resumoTextoAlerta: { color: '#92400E' },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  linha: { position: 'absolute', height: 3, transformOrigin: 'left' },
  linhaOk: { backgroundColor: '#4ADE80' },
  linhaAlerta: { backgroundColor: '#F59E0B' },
  linhaRef: { position: 'absolute', height: 1.5, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  badgeFlutuante: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 40, alignItems: 'center' },
  badgeFlutuanteTexto: { fontSize: 11, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#334155', fontSize: 14, flex: 1, fontWeight: '600' },
  cardRef: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 70, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeNeutro: { backgroundColor: '#F1F5F9' },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  badgeTextNeutro: { color: '#64748B' },
  btnObservacao: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5' },
  btnObservacaoAtivo: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  btnObservacaoText: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
  btnObservacaoTextAtivo: { color: '#B91C1C' },
  dicaArrastar: { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 16 },
  btnRestaurar: { backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  btnRestaurarText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
