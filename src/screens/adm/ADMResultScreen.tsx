import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import db from '../../services/database';
import { salvarMidiaPermanente } from '../../services/armazenamento';
import { MOVIMENTOS } from '../../constants/movimentos';
import MarcadorComLupa from '../../components/MarcadorComLupa';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 32;

export default function ADMResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, movimentoId, pontos } = route.params as {
    fotoUri: string; pacienteId: number; movimentoId: string; pontos: Record<string, Ponto>;
  };

  const movimento = MOVIMENTOS.find(m => m.id === movimentoId);
  const ids = movimento ? movimento.pontos.map(p => p.id) : [];

  const [pontosEditaveis, setPontosEditaveis] = useState<Record<string, Ponto>>(pontos);

  const moverPonto = (id: string, x: number, y: number) => {
    setPontosEditaveis(prev => ({ ...prev, [id]: { x, y } }));
  };

  const restaurarPontos = () => setPontosEditaveis(pontos);

  const [observacoes, setObservacoes] = useState<Record<string, Ponto>>({});
  const [modoObservacao, setModoObservacao] = useState(false);

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

  const angulo = useMemo(() => {
    if (!movimento) return null;
    const a = pontosEditaveis[ids[0]];
    const vertice = pontosEditaveis[ids[1]];
    const c = pontosEditaveis[ids[2]];
    if (!a || !vertice || !c) return null;

    const v1x = a.x - vertice.x;
    const v1y = a.y - vertice.y;
    const v2x = c.x - vertice.x;
    const v2y = c.y - vertice.y;

    const produto = v1x * v2x + v1y * v2y;
    const mod1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const mod2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (mod1 === 0 || mod2 === 0) return null;

    const cos = Math.max(-1, Math.min(1, produto / (mod1 * mod2)));
    return Number((Math.acos(cos) * (180 / Math.PI)).toFixed(1));
  }, [pontosEditaveis, movimento]);

  const referencia = movimento ? movimento.referencia : 0;
  const deficit = angulo !== null ? Number((referencia - angulo).toFixed(1)) : null;
  const alerta = deficit !== null && deficit > 10;

  const resumo = useMemo(() => {
    if (angulo === null) return null;
    if (!alerta) return 'Amplitude dentro do esperado para este movimento.';
    return `Déficit de amplitude detectado: ${deficit}° abaixo da referência. Recomenda-se avaliação clínica complementar.`;
  }, [angulo, alerta, deficit]);

  // Calcula o ponto ideal a partir do vertice, mantendo o comprimento do segmento medido
  // e rotacionando o segmento de referencia pelo angulo normativo, no mesmo sentido do movimento real.
  const pontoIdeal = useMemo(() => {
    if (ids.length !== 3) return null;
    const a = pontosEditaveis[ids[0]];
    const vertice = pontosEditaveis[ids[1]];
    const c = pontosEditaveis[ids[2]];
    if (!a || !vertice || !c) return null;

    const anguloVetor = (dx: number, dy: number) => Math.atan2(dy, dx);
    const anguloBase = anguloVetor(a.x - vertice.x, a.y - vertice.y);
    const anguloMedido = anguloVetor(c.x - vertice.x, c.y - vertice.y);

    let diff = anguloMedido - anguloBase;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const sentido = diff >= 0 ? 1 : -1;

    const anguloIdeal = anguloBase + sentido * (referencia * Math.PI / 180);
    const comprimento = Math.sqrt((c.x - vertice.x) ** 2 + (c.y - vertice.y) ** 2);

    return {
      x: vertice.x + comprimento * Math.cos(anguloIdeal),
      y: vertice.y + comprimento * Math.sin(anguloIdeal),
    };
  }, [pontosEditaveis, referencia, ids]);

  const salvarAvaliacao = async () => {
    if (angulo === null || !movimento) {
      Alert.alert('Erro', 'Marque os tres pontos antes de salvar.');
      return;
    }
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const fotoPermanente = await salvarMidiaPermanente(fotoUri);
      db.runSync(
        'INSERT INTO avaliacoes_adm (id_paciente, movimento, data_avaliacao, foto_uri, pontos_json, angulo, referencia, observacoes_json, dimensoes_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [pacienteId, movimento.nome, dataHoje, fotoPermanente, JSON.stringify(pontosEditaveis), angulo, referencia, JSON.stringify(observacoes), JSON.stringify({ largura: IMAGE_WIDTH, altura: IMAGE_HEIGHT })]
      );
      Alert.alert('Sucesso', 'Avaliacao de amplitude salva no historico do paciente!', [
        { text: 'OK', onPress: () => navigation.navigate('ADMHome') },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliacao ADM:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a avaliacao.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {resumo && (
        <View style={[styles.resumoCard, alerta ? styles.resumoAlerta : styles.resumoOk]}>
          <Text style={[styles.resumoTexto, alerta ? styles.resumoTextoAlerta : styles.resumoTextoOk]}>{resumo}</Text>
        </View>
      )}

      <View style={styles.imageContainer} onStartShouldSetResponder={() => modoObservacao} onResponderRelease={adicionarObservacao}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />
        {ids.length === 3 && pontosEditaveis[ids[0]] && pontosEditaveis[ids[1]] && (
          <LinhaSegmento a={pontosEditaveis[ids[1]]} b={pontosEditaveis[ids[0]]} />
        )}
        {ids.length === 3 && pontosEditaveis[ids[1]] && pontosEditaveis[ids[2]] && (
          <LinhaSegmento a={pontosEditaveis[ids[1]]} b={pontosEditaveis[ids[2]]} alerta={alerta} destaque />
        )}
        {pontoIdeal && pontosEditaveis[ids[1]] && (
          <LinhaIdeal a={pontosEditaveis[ids[1]]} b={pontoIdeal} />
        )}
        {angulo !== null && pontosEditaveis[ids[1]] && (
          <BadgeNoVertice ponto={pontosEditaveis[ids[1]]} valor={angulo} alerta={alerta} />
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

      <Text style={styles.sectionTitle}>{movimento ? movimento.nome : 'Resultado'}</Text>
      {angulo === null ? (
        <Text style={styles.semDados}>Nao foi possivel calcular. Marque os tres pontos.</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Amplitude Medida</Text>
            <View style={[styles.badge, styles.badgeOk]}>
              <Text style={[styles.badgeText, styles.badgeTextOk]}>{angulo} graus</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Referencia Normal</Text>
            <View style={[styles.badge, styles.badgeNeutro]}>
              <Text style={[styles.badgeText, styles.badgeTextNeutro]}>{referencia} graus</Text>
            </View>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Deficit</Text>
            <View style={[styles.badge, alerta ? styles.badgeAlerta : styles.badgeOk]}>
              <Text style={[styles.badgeText, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{deficit} graus</Text>
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

      {Object.keys(observacoes).length > 0 && (
        <Text style={styles.dicaArrastar}>Toque longo em um circulo vermelho para remove-lo.</Text>
      )}

      <Text style={styles.dicaArrastar}>Toque e arraste qualquer ponto na foto para corrigir a posicao. Os valores recalculam automaticamente.</Text>

      <TouchableOpacity style={styles.btnRestaurar} onPress={restaurarPontos}>
        <Text style={styles.btnRestaurarText}>Restaurar posicoes originais</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSalvar} onPress={salvarAvaliacao}>
        <Text style={styles.btnSalvarText}>Salvar no Historico do Paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function LinhaSegmento({ a, b, alerta, destaque }: { a: Ponto; b: Ponto; alerta?: boolean; destaque?: boolean }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  const cor = destaque ? (alerta ? styles.linhaAlerta : styles.linhaOk) : styles.linhaNeutra;
  return (
    <View style={[styles.linha, cor, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: ang + 'deg' }] }]} />
  );
}

function LinhaIdeal({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View style={[styles.linhaIdeal, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: ang + 'deg' }] }]} />
  );
}

function BadgeNoVertice({ ponto, valor, alerta }: { ponto: Ponto; valor: number; alerta: boolean }) {
  return (
    <View style={[styles.badgeFlutuante, alerta ? styles.badgeAlerta : styles.badgeOk, { left: ponto.x + 12, top: ponto.y - 14 }]}>
      <Text style={[styles.badgeFlutuanteTexto, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{valor}°</Text>
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
  marcador: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 1, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 3, transformOrigin: 'left' },
  linhaOk: { backgroundColor: '#4ADE80' },
  linhaAlerta: { backgroundColor: '#F59E0B' },
  linhaNeutra: { backgroundColor: '#94A3B8', height: 2 },
  linhaIdeal: { position: 'absolute', height: 2, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(74,222,128,0.8)', transformOrigin: 'left' },
  badgeFlutuante: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 40, alignItems: 'center' },
  badgeFlutuanteTexto: { fontSize: 11, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#334155', fontSize: 14, flex: 1, fontWeight: '500' },
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
