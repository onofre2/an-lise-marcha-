import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions, PanResponder } from 'react-native';
import { SEGMENTOS_RAPIDA, Vista } from '../../constants/posturalPoints';
import { calcularDesajustes, Desajuste } from '../../services/posturalCalculations';
import db from '../../services/database';
import { salvarMidiaPermanente } from '../../services/armazenamento';
import { gerarRelatorioPostural } from '../../services/pdfService';
import MarcadorComLupa from '../../components/MarcadorComLupa';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 32;

// Mapeia pares de pontos para o rotulo do desajuste correspondente (vistas anterior/posterior)
const MAPA_LABEL: Record<string, string> = {
  'trago_d|trago_e': 'Alinhamento da Cabeça',
  'acromio_d|acromio_e': 'Alinhamento dos Ombros',
  'eias_d|eias_e': 'Alinhamento da Pelve (EIAS)',
  'eips_d|eips_e': 'Alinhamento da Pelve (EIPS)',
  'joelho_d|joelho_e': 'Alinhamento dos Joelhos',
  'tornozelo_d|tornozelo_e': 'Alinhamento dos Tornozelos',
};

// Mapeia ponto individual para o rotulo do desvio correspondente (vista lateral)
const MAPA_LATERAL: Record<string, string> = {
  trago: 'Desvio da Cabeça',
  acromio: 'Desvio do Ombro',
  trocanter: 'Desvio do Quadril',
  joelho: 'Desvio do Joelho',
};

export default function PosturalResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, vista, modo, pontos } = route.params as {
    fotoUri: string; pacienteId: number; vista: Vista; modo: 'rapida' | 'completa'; pontos: Record<string, Ponto>;
  };

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

  const desajustes = useMemo(() => calcularDesajustes(vista, pontosEditaveis), [vista, pontosEditaveis]);
  const segmentos = SEGMENTOS_RAPIDA[vista];
  const ehLateral = vista.startsWith('lateral');
  const alterados = desajustes.filter(d => d.alerta);
  const resumo = useMemo(() => gerarResumoClinico(alterados), [alterados]);

  const buscarDesajusteSegmento = (idA: string, idB: string): Desajuste | undefined => {
    const label = MAPA_LABEL[`${idA}|${idB}`] || MAPA_LABEL[`${idB}|${idA}`];
    if (!label) return undefined;
    return desajustes.find(d => d.label === label);
  };

  const buscarDesajustePonto = (id: string): Desajuste | undefined => {
    const termo = MAPA_LATERAL[id];
    if (!termo) return undefined;
    return desajustes.find(d => d.label.includes(termo));
  };

  const salvarAvaliacao = async () => {
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const fotoPermanente = await salvarMidiaPermanente(fotoUri);
      db.runSync(
        `INSERT INTO avaliacoes_posturais (id_paciente, vista, modo, data_avaliacao, foto_uri, pontos_json, medidas_json, observacoes_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [pacienteId, vista, modo, dataHoje, fotoPermanente, JSON.stringify(pontosEditaveis), JSON.stringify(desajustes), JSON.stringify(observacoes)]
      );
      const nova = db.getFirstSync('SELECT last_insert_rowid() as id') as { id: number };
      Alert.alert('Sucesso', 'Avaliacao salva! Deseja gerar o relatorio em PDF?', [
        { text: 'Agora nao', onPress: () => navigation.navigate('PosturalHome') },
        {
          text: 'Gerar PDF',
          onPress: async () => {
            try {
              await gerarRelatorioPostural(nova.id);
            } catch (e) {
              Alert.alert('Erro', 'Nao foi possivel gerar o PDF.');
            }
            navigation.navigate('PosturalHome');
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliação postural:', error);
      Alert.alert('Erro', 'Não foi possível salvar a avaliação.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {resumo && (
        <View style={[styles.resumoCard, alterados.length > 0 ? styles.resumoAlerta : styles.resumoOk]}>
          <Text style={[styles.resumoTexto, alterados.length > 0 ? styles.resumoTextoAlerta : styles.resumoTextoOk]}>{resumo}</Text>
        </View>
      )}

      <View style={styles.imageContainer} onStartShouldSetResponder={() => modoObservacao} onResponderRelease={adicionarObservacao}>
        <Image source={{ uri: fotoUri }} style={styles.image} resizeMode="contain" />

        {ehLateral && pontosEditaveis.maleolo && (
          <View style={[styles.linhaPrumo, { left: pontosEditaveis.maleolo.x }]} />
        )}

        {segmentos.map(([idA, idB], i) => {
          const a = pontosEditaveis[idA];
          const b = pontosEditaveis[idB];
          if (!a || !b) return null;
          const d = !ehLateral ? buscarDesajusteSegmento(idA, idB) : undefined;
          return (
            <React.Fragment key={i}>
              {d && <LinhaReferenciaHorizontal a={a} b={b} />}
              <LinhaSegmento a={a} b={b} alerta={d?.alerta} />
              {d && <BadgeNaLinha a={a} b={b} desajuste={d} />}
            </React.Fragment>
          );
        })}

        {ehLateral && Object.entries(pontosEditaveis).map(([id, p]) => {
          const d = buscarDesajustePonto(id);
          if (!d) return null;
          return <BadgeNoPonto key={id} p={p} desajuste={d} />;
        })}

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

      <Text style={styles.sectionTitle}>Desajustes Encontrados</Text>
      {desajustes.length === 0 ? (
        <Text style={styles.semDados}>Nenhum desajuste calculável com os pontos marcados.</Text>
      ) : (
        desajustes.map((d, i) => (
          <View key={i} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{d.label}</Text>
              <Text style={styles.cardDescricao}>{descreverAchado(d)}</Text>
            </View>
            <View style={[styles.badge, d.alerta ? styles.badgeAlerta : styles.badgeOk]}>
              <Text style={[styles.badgeText, d.alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>
                {d.valor}{d.unidade}
              </Text>
            </View>
          </View>
        ))
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
        <Text style={styles.btnSalvarText}>Salvar no Histórico do Paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function gerarResumoClinico(alterados: Desajuste[]): string {
  if (alterados.length === 0) {
    return 'Nenhum desajuste significativo encontrado nesta avaliação.';
  }
  const nomes = alterados.map(d => d.label.replace('Alinhamento d', 'd').toLowerCase());
  return `${alterados.length} desajuste${alterados.length > 1 ? 's' : ''} detectado${alterados.length > 1 ? 's' : ''}: ${nomes.join(', ')}. Recomenda-se avaliação clínica complementar.`;
}

function descreverAchado(d: Desajuste): string {
  if (!d.alerta) return 'Dentro dos parâmetros esperados.';
  return `Desvio acima da referência (${d.valor}${d.unidade}).`;
}

function LinhaSegmento({ a, b, alerta }: { a: Ponto; b: Ponto; alerta?: boolean }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const angulo = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View
      style={[
        styles.linha,
        alerta ? styles.linhaAlerta : styles.linhaOk,
        { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: `${angulo}deg` }] },
      ]}
    />
  );
}

function LinhaReferenciaHorizontal({ a, b }: { a: Ponto; b: Ponto }) {
  const [offsetY, setOffsetY] = useState(0);
  const startOffset = React.useRef(0);
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startOffset.current = offsetY; },
      onPanResponderMove: (evt, g) => setOffsetY(startOffset.current + g.dy),
    })
  ).current;

  const yMedio = (a.y + b.y) / 2 + offsetY;
  const largura = Math.abs(b.x - a.x) + 30;
  const esquerda = Math.min(a.x, b.x) - 15;

  return (
    <View {...panResponder.panHandlers} style={[styles.linhaRefArea, { left: esquerda, top: yMedio - 10, width: largura }]}>
      <View style={styles.linhaRefTraco} />
    </View>
  );
}

function BadgeNaLinha({ a, b, desajuste }: { a: Ponto; b: Ponto; desajuste: Desajuste }) {
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  const texto = desajuste.unidade === '°' ? `${desajuste.valor}°` : `${desajuste.valor}%`;
  return (
    <View style={[styles.badgeFlutuante, desajuste.alerta ? styles.badgeAlerta : styles.badgeOk, { left: x - 24, top: y - 30 }]}>
      <Text style={[styles.badgeFlutuanteTexto, desajuste.alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{texto}</Text>
    </View>
  );
}

function BadgeNoPonto({ p, desajuste }: { p: Ponto; desajuste: Desajuste }) {
  const texto = desajuste.unidade === '°' ? `${desajuste.valor}°` : `${desajuste.valor}%`;
  return (
    <View style={[styles.badgeFlutuante, desajuste.alerta ? styles.badgeAlerta : styles.badgeOk, { left: p.x + 10, top: p.y - 14 }]}>
      <Text style={[styles.badgeFlutuanteTexto, desajuste.alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{texto}</Text>
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
  linhaPrumo: { position: 'absolute', width: 2, height: '100%', backgroundColor: 'rgba(74,222,128,0.6)' },
  linhaRefArea: { position: 'absolute', height: 20, justifyContent: 'center' },
  linhaRefTraco: { height: 1.5, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', width: '100%' },
  badgeFlutuante: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 40, alignItems: 'center' },
  badgeFlutuanteTexto: { fontSize: 11, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  cardLabel: { color: '#334155', fontSize: 14, fontWeight: '600' },
  cardDescricao: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 56, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  btnObservacao: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5' },
  btnObservacaoAtivo: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  btnObservacaoText: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
  btnObservacaoTextAtivo: { color: '#B91C1C' },
  dicaArrastar: { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 4, marginBottom: 12, lineHeight: 16 },
  btnRestaurar: { backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  btnRestaurarText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
