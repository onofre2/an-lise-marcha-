import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions, PanResponder } from 'react-native';
import db from '../../services/database';
import { gerarAchadosCervical } from '../../services/interpretacaoClinica';
import { salvarMidiaPermanente } from '../../services/armazenamento';
import { gerarRelatorioCervical } from '../../services/pdfService';
import { Observacao } from '../../services/observacoes';
import SetaDesajuste from '../../components/SetaDesajuste';
import MarcadorComLupa from '../../components/MarcadorComLupa';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 32;

// Angulo entre a linha origem->alvo e a horizontal (0 a 90 graus)
function anguloComHorizontal(origem: Ponto, alvo: Ponto): number {
  const dx = Math.abs(alvo.x - origem.x);
  const dy = Math.abs(alvo.y - origem.y);
  if (dx === 0) return 90;
  return Number((Math.atan2(dy, dx) * (180 / Math.PI)).toFixed(1));
}

export default function CervicalResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, pontos } = route.params as {
    fotoUri: string; pacienteId: number; pontos: Record<string, Ponto>;
  };

  const [pontosEditaveis, setPontosEditaveis] = useState<Record<string, Ponto>>(pontos);

  // Os pontos sao gravados normalizados (0 a 1). O angulo so e correto em
  // pixel: a area nao e quadrada, entao o espaco normalizado distorce.
  const pontosPx = React.useMemo(() => {
    const out: Record<string, Ponto> = {};
    for (const [id, pt] of Object.entries(pontosEditaveis)) {
      out[id] = { x: pt.x * IMAGE_WIDTH, y: pt.y * IMAGE_HEIGHT };
    }
    return out;
  }, [pontosEditaveis]);

  const moverPonto = (id: string, x: number, y: number) => {
    const nx = Math.min(Math.max(x / IMAGE_WIDTH, 0), 1);
    const ny = Math.min(Math.max(y / IMAGE_HEIGHT, 0), 1);
    setPontosEditaveis(prev => ({ ...prev, [id]: { x: nx, y: ny } }));
  };

  const restaurarPontos = () => setPontosEditaveis(pontos);

  const [observacoes, setObservacoes] = useState<Record<string, Observacao>>({});
  const [modoObservacao, setModoObservacao] = useState(false);
  const [mostrarGrade, setMostrarGrade] = useState(false);
  const [semCor, setSemCor] = useState(false);

  const adicionarObservacao = (evt: any) => {
    if (!modoObservacao) return;
    const { locationX, locationY } = evt.nativeEvent;
    const novoId = `obs_${Date.now()}`;
    const bx = locationX / IMAGE_WIDTH;
    const by = locationY / IMAGE_HEIGHT;
    setObservacoes(prev => ({
      ...prev,
      [novoId]: { base: { x: bx, y: by }, ponta: { x: Math.min(bx + 0.16, 1), y: by } },
    }));
  };

  const moverPontaObservacao = (id: string, x: number, y: number) => {
    setObservacoes(prev => {
      const atual = prev[id];
      if (!atual) return prev;
      return {
        ...prev,
        [id]: {
          ...atual,
          ponta: {
            x: Math.min(Math.max(x / IMAGE_WIDTH, 0), 1),
            y: Math.min(Math.max(y / IMAGE_HEIGHT, 0), 1),
          },
        },
      };
    });
  };

  const removerObservacao = (id: string) => {
    setObservacoes(prev => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const cva = useMemo(() => {
    if (!pontosPx.c7 || !pontosPx.trago) return null;
    return anguloComHorizontal(pontosPx.c7, pontosPx.trago);
  }, [pontosEditaveis]);

  const anguloOmbro = useMemo(() => {
    if (!pontosPx.acromio || !pontosPx.c7) return null;
    return anguloComHorizontal(pontosPx.acromio, pontosPx.c7);
  }, [pontosEditaveis]);

  // Referencias clinicas: CVA normal >= 48 graus; angulo do ombro normal > 52 graus
  const achados = React.useMemo(
    () => gerarAchadosCervical(cva, anguloOmbro),
    [cva, anguloOmbro]
  );

  const alertaCva = cva !== null && cva < 48;
  const alertaOmbro = anguloOmbro !== null && anguloOmbro < 52;
  const totalAlertas = (alertaCva ? 1 : 0) + (alertaOmbro ? 1 : 0);

  const resumo = useMemo(() => {
    if (cva === null) return null;
    if (totalAlertas === 0) return 'Nenhum desajuste significativo encontrado nesta avaliação.';
    const partes: string[] = [];
    if (alertaCva) partes.push('cabeça anteriorizada');
    if (alertaOmbro) partes.push('ombro protruso');
    return `${totalAlertas} desajuste${totalAlertas > 1 ? 's' : ''} detectado${totalAlertas > 1 ? 's' : ''}: ${partes.join(', ')}. Recomenda-se avaliação clínica complementar.`;
  }, [cva, totalAlertas, alertaCva, alertaOmbro]);

  const salvarAvaliacao = async () => {
    if (cva === null) {
      Alert.alert('Erro', 'Marque C7 e o trago antes de salvar.');
      return;
    }
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const fotoPermanente = await salvarMidiaPermanente(fotoUri);
      db.runSync(
        'INSERT INTO avaliacoes_cervicais (id_paciente, data_avaliacao, foto_uri, pontos_json, angulo, observacoes_json, dimensoes_json, achados_json, sem_cor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [pacienteId, dataHoje, fotoPermanente, JSON.stringify(pontosEditaveis), cva, JSON.stringify(observacoes), JSON.stringify({ largura: IMAGE_WIDTH, altura: IMAGE_HEIGHT }), JSON.stringify(achados), 0]
      );
      const nova = db.getFirstSync('SELECT last_insert_rowid() as id') as { id: number };
      Alert.alert('Sucesso', 'Avaliacao salva! Deseja gerar o relatorio em PDF?', [
        { text: 'Agora nao', onPress: () => navigation.navigate('CervicalHome') },
        {
          text: 'Gerar PDF',
          onPress: async () => {
            try {
              await gerarRelatorioCervical(nova.id);
            } catch (e) {
              Alert.alert('Erro', 'Nao foi possivel gerar o PDF.');
            }
            navigation.navigate('CervicalHome');
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliacao cervical:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a avaliacao.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {resumo && (
        <View style={[styles.resumoCard, totalAlertas > 0 ? styles.resumoAlerta : styles.resumoOk]}>
          <Text style={[styles.resumoTexto, totalAlertas > 0 ? styles.resumoTextoAlerta : styles.resumoTextoOk]}>{resumo}</Text>
        </View>
      )}

      <View
        style={styles.imageContainer}
        // Captura antes dos filhos para a marcacao nascer mesmo sobre um ponto,
        // mas nao intercepta o toque na ponta de uma seta ja existente, que
        // precisa continuar arrastavel.
        onStartShouldSetResponderCapture={(evt: any) => {
          if (!modoObservacao) return false;
          const { locationX, locationY } = evt.nativeEvent;
          const sobreUmaSeta = Object.values(observacoes).some(o => {
            const px = o.ponta.x * IMAGE_WIDTH;
            const py = o.ponta.y * IMAGE_HEIGHT;
            return Math.abs(locationX - px) < 22 && Math.abs(locationY - py) < 22;
          });
          return !sobreUmaSeta;
        }}
        onResponderRelease={adicionarObservacao}
      >
        <Image
          source={{ uri: fotoUri }}
          style={[styles.image, semCor && styles.imagemSemCor]}
          resizeMode="contain"
        />
        {semCor && <View pointerEvents="none" style={styles.camadaSemCor} />}

        {mostrarGrade && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {Array.from({ length: 11 }).map((_, i) => (
              <View key={`gv-${i}`} style={[styles.gradeLinhaV, { left: (IMAGE_WIDTH / 10) * i }]} />
            ))}
            {Array.from({ length: 13 }).map((_, i) => (
              <View key={`gh-${i}`} style={[styles.gradeLinhaH, { top: (IMAGE_HEIGHT / 12) * i }]} />
            ))}
          </View>
        )}

        {pontosPx.c7 && <LinhaReferenciaHorizontal ponto={pontosPx.c7} />}

        {/* Eixo ideal: vertical a partir do acromio. Eixo real: acromio ate o
            trago, mostrando o quanto a cabeca se projeta a frente. */}
        {pontosPx.acromio && (
          <View pointerEvents="none" style={[styles.eixoIdeal, { left: pontosPx.acromio.x }]} />
        )}
        {pontosPx.acromio && pontosPx.trago && (() => {
          const a = pontosPx.acromio;
          const b = pontosPx.trago;
          const dy = b.y - a.y;
          const inc = dy === 0 ? 0 : (b.x - a.x) / dy;
          const xTopo = a.x + (0 - a.y) * inc;
          const xBase = a.x + (IMAGE_HEIGHT - a.y) * inc;
          const comp = Math.sqrt((xBase - xTopo) ** 2 + IMAGE_HEIGHT ** 2);
          const ang = Math.atan2(IMAGE_HEIGHT, xBase - xTopo) * (180 / Math.PI);
          return (
            <View
              pointerEvents="none"
              style={[styles.eixoReal, {
                left: (xTopo + xBase) / 2 - comp / 2,
                top: IMAGE_HEIGHT / 2,
                width: comp,
                transform: [{ rotate: `${ang}deg` }],
              }]}
            />
          );
        })()}
        {pontosPx.c7 && pontosPx.trago && (
          <>
            <LinhaSegmento a={pontosPx.c7} b={pontosPx.trago} alerta={alertaCva} />
            <BadgeNaLinha a={pontosPx.c7} b={pontosPx.trago} valor={cva} alerta={alertaCva} />
          </>
        )}
        {pontosPx.c7 && pontosPx.acromio && (
          <>
            <LinhaSegmento a={pontosPx.acromio} b={pontosPx.c7} alerta={alertaOmbro} />
            <BadgeNaLinha a={pontosPx.acromio} b={pontosPx.c7} valor={anguloOmbro} alerta={alertaOmbro} />
          </>
        )}
        {Object.entries(pontosPx).map(([id, p]) => (
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

        {Object.entries(observacoes).map(([id, o]) => (
          <SetaDesajuste
            key={id}
            id={id}
            base={{ x: o.base.x * IMAGE_WIDTH, y: o.base.y * IMAGE_HEIGHT }}
            ponta={{ x: o.ponta.x * IMAGE_WIDTH, y: o.ponta.y * IMAGE_HEIGHT }}
            onMoverPonta={moverPontaObservacao}
            onLongPress={removerObservacao}
          />
        ))}
      </View>

      {achados.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Diagnóstico Clínico Sugerido</Text>
          {achados.map((a, i) => (
            <View key={i} style={[styles.cardAchado, a.alerta && styles.cardAchadoAlerta]}>
              <Text style={styles.cardAchadoTitulo}>{a.titulo}</Text>
              <Text style={styles.cardAchadoTexto}>{a.descricao}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Resultado</Text>

      {cva === null ? (
        <Text style={styles.semDados}>Marque C7 e o trago para calcular.</Text>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardTexto}>
            <Text style={styles.cardLabel}>Angulo Craniovertebral</Text>
            <Text style={styles.cardRef}>Normal: 48 graus ou mais</Text>
          </View>
          <View style={[styles.badge, alertaCva ? styles.badgeAlerta : styles.badgeOk]}>
            <Text style={[styles.badgeText, alertaCva ? styles.badgeTextAlerta : styles.badgeTextOk]}>{cva} graus</Text>
          </View>
        </View>
      )}

      {anguloOmbro !== null && (
        <View style={styles.card}>
          <View style={styles.cardTexto}>
            <Text style={styles.cardLabel}>Angulo do Ombro</Text>
            <Text style={styles.cardRef}>Normal: acima de 52 graus</Text>
          </View>
          <View style={[styles.badge, alertaOmbro ? styles.badgeAlerta : styles.badgeOk]}>
            <Text style={[styles.badgeText, alertaOmbro ? styles.badgeTextAlerta : styles.badgeTextOk]}>{anguloOmbro} graus</Text>
          </View>
        </View>
      )}


      <View style={styles.barraVisual}>
        <TouchableOpacity
          style={[styles.btnVisual, mostrarGrade && styles.btnVisualAtivo]}
          onPress={() => setMostrarGrade(!mostrarGrade)}
        >
          <Text style={[styles.btnVisualText, mostrarGrade && styles.btnVisualTextAtivo]}>Grade</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnVisual, semCor && styles.btnVisualAtivo]}
          onPress={() => setSemCor(!semCor)}
        >
          <Text style={[styles.btnVisualText, semCor && styles.btnVisualTextAtivo]}>P e B</Text>
        </TouchableOpacity>
      </View>

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

function LinhaSegmento({ a, b, alerta }: { a: Ponto; b: Ponto; alerta?: boolean }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const ang = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View style={[styles.linha, alerta ? styles.linhaAlerta : styles.linhaOk, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: ang + 'deg' }] }]} />
  );
}

function LinhaReferenciaHorizontal({ ponto }: { ponto: Ponto }) {
  const [offsetY, setOffsetY] = useState(0);
  const startOffset = React.useRef(0);
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { startOffset.current = offsetY; },
      onPanResponderMove: (evt, g) => setOffsetY(startOffset.current + g.dy),
    })
  ).current;

  return (
    <View {...panResponder.panHandlers} style={[styles.linhaRefArea, { left: ponto.x - 75, top: ponto.y - 10 + offsetY }]}>
      <View style={styles.linhaRefTraco} />
    </View>
  );
}

function BadgeNaLinha({ a, b, valor, alerta }: { a: Ponto; b: Ponto; valor: number | null; alerta: boolean }) {
  if (valor === null) return null;
  const x = (a.x + b.x) / 2;
  const y = (a.y + b.y) / 2;
  return (
    <View style={[styles.badgeFlutuante, alerta ? styles.badgeAlerta : styles.badgeOk, { left: x - 22, top: y - 28 }]}>
      <Text style={[styles.badgeFlutuanteTexto, alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>{valor}°</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  barraVisual: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btnVisual: { flex: 1, backgroundColor: '#E0F2FE', paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#7DD3FC' },
  btnVisualAtivo: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  btnVisualText: { color: '#0369A1', fontWeight: '700', fontSize: 13 },
  btnVisualTextAtivo: { color: '#FFFFFF' },
  imagemSemCor: { opacity: 0.55 },
  camadaSemCor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', opacity: 0.18 },
  gradeLinhaV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  gradeLinhaH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  resumoCard: { padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  resumoOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  resumoAlerta: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  resumoTexto: { fontSize: 13, lineHeight: 19 },
  resumoTextoOk: { color: '#166534' },
  resumoTextoAlerta: { color: '#92400E' },
  cardAchado: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#94A3B8' },
  cardAchadoAlerta: { backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' },
  cardAchadoTitulo: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  cardAchadoTexto: { fontSize: 13, color: '#475569', lineHeight: 18 },
  eixoIdeal: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#22C55E' },
  eixoReal: { position: 'absolute', height: 2, backgroundColor: '#EF4444' },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#22C55E', borderWidth: 1, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 3, transformOrigin: 'left' },
  linhaOk: { backgroundColor: '#4ADE80' },
  linhaAlerta: { backgroundColor: '#F59E0B' },
  linhaRefArea: { position: 'absolute', width: 150, height: 20, justifyContent: 'center' },
  linhaRefTraco: { height: 1.5, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(148,163,184,0.9)', width: '100%' },
  badgeFlutuante: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, minWidth: 40, alignItems: 'center' },
  badgeFlutuanteTexto: { fontSize: 11, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTexto: { flex: 1 },
  cardLabel: { color: '#334155', fontSize: 14, fontWeight: '600' },
  cardRef: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 70, alignItems: 'center' },
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
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
