import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions } from 'react-native';
import db from '../../services/database';
import { salvarMidiaPermanente } from '../../services/armazenamento';
import { calcularJoelho } from '../../services/joelhoCalculations';
import { gerarRelatorioJoelho } from '../../services/pdfService';
import { LABEL_VISTA } from '../../constants/joelhoPoints';
import MarcadorComLupa from '../../components/MarcadorComLupa';
import CirculoDestaque, { RAIO_PADRAO } from '../../components/CirculoDestaque';
import { Observacao } from '../../services/observacoes';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 32;

// Cada card aparece em uma unica vista, sem repeticao.
const CARDS_POR_VISTA: Record<string, string[]> = {
  anterior: [
    'Joelho varo - direito',
    'Joelho varo - esquerdo',
    'Joelho valgo - direito',
    'Joelho valgo - esquerdo',
  ],
  lateral_direita: [
    'Joelho recurvato - direito',
    'Joelho flexo - direito',
  ],
  lateral_esquerda: [
    'Joelho recurvato - esquerdo',
    'Joelho flexo - esquerdo',
  ],
  retrope: [],
};

const OPCOES_PISADA = ['Pronada', 'Neutra', 'Supinada'];

// Segmentos ligados por linha em cada vista, na ordem proximal-vertice-distal.
const SEGMENTOS_VISTA: Record<string, [string, string][]> = {
  anterior: [
    ['eias_d', 'patela_d'], ['patela_d', 'maleolo_d'],
    ['eias_e', 'patela_e'], ['patela_e', 'maleolo_e'],
  ],
  lateral_direita: [['trocanter', 'epicondilo'], ['epicondilo', 'maleolo']],
  lateral_esquerda: [['trocanter', 'epicondilo'], ['epicondilo', 'maleolo']],
  retrope: [
    ['base_d', 'insercao_d'], ['tendao_d', 'perna_d'],
    ['base_e', 'insercao_e'], ['tendao_e', 'perna_e'],
  ],
};

// Linha de referencia que corta os pontos mostrando o sentido do desvio.
const EIXOS_REFERENCIA: Record<string, [string, string][]> = {
  anterior: [['eias_d', 'maleolo_d'], ['eias_e', 'maleolo_e']],
  lateral_direita: [['trocanter', 'maleolo']],
  lateral_esquerda: [['trocanter', 'maleolo']],
  retrope: [['base_d', 'perna_d'], ['base_e', 'perna_e']],
};

// Achados clinicos numerados, na ordem da imagem de referencia.
// O item 13 nao tem ilustracao.
const ACHADOS_JOELHO = [
  'Dor Patelar',
  'Lesao no Menisco',
  'Degeneracao do Menisco',
  'Tendinite',
  'Ligamento Cruzado',
  'Tendinite Patelar',
  'Bursite',
  'Artrose Inicial',
  'Bursite (variacao)',
  'Artrose Avancada',
  'Ligamento Lateral',
  'Cisto de Baker',
  'Derrame Articular',
];

const LADOS_ACHADO = ['Direito', 'Esquerdo', 'Bilateral'];

export default function JoelhoResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, vista, pontos } = route.params as {
    fotoUri: string; pacienteId: number; vista: string; pontos: Record<string, Ponto>;
  };

  const [pontosEditaveis, setPontosEditaveis] = useState<Record<string, Ponto>>(pontos);
  const [observacoes, setObservacoes] = useState<Record<string, Observacao>>({});
  const [modoObservacao, setModoObservacao] = useState(false);
  const [cardsMarcados, setCardsMarcados] = useState<string[]>([]);
  const [pisada, setPisada] = useState<Record<string, string>>({});
  const [semCor, setSemCor] = useState(false);
  const [mostrarGrade, setMostrarGrade] = useState(false);

  // Achados marcados: numero do achado para o lado escolhido.
  const [achados, setAchados] = useState<Record<number, string>>({});
  const [achadoAberto, setAchadoAberto] = useState<number | null>(null);

  const escolherLadoAchado = (numero: number, lado: string) => {
    setAchados(prev => ({ ...prev, [numero]: lado }));
    setAchadoAberto(null);
  };

  const alternarAchado = (numero: number) => {
    if (achados[numero]) {
      setAchados(prev => {
        const copia = { ...prev };
        delete copia[numero];
        return copia;
      });
      setAchadoAberto(null);
      return;
    }
    setAchadoAberto(achadoAberto === numero ? null : numero);
  };

  const pontosPx = useMemo(() => {
    const out: Record<string, Ponto> = {};
    for (const [id, pt] of Object.entries(pontosEditaveis)) {
      out[id] = { x: pt.x * IMAGE_WIDTH, y: pt.y * IMAGE_HEIGHT };
    }
    return out;
  }, [pontosEditaveis]);

  const medidas = useMemo(() => calcularJoelho(vista, pontosPx), [vista, pontosEditaveis]);

  const moverPonto = (id: string, x: number, y: number) => {
    const nx = Math.min(Math.max(x / IMAGE_WIDTH, 0), 1);
    const ny = Math.min(Math.max(y / IMAGE_HEIGHT, 0), 1);
    setPontosEditaveis(prev => ({ ...prev, [id]: { x: nx, y: ny } }));
  };

  const restaurarPontos = () => setPontosEditaveis(pontos);

  const alternarCard = (card: string) => {
    setCardsMarcados(prev =>
      prev.includes(card) ? prev.filter(c => c !== card) : [...prev, card]
    );
  };

  const escolherPisada = (lado: string, valor: string) => {
    setPisada(prev => ({ ...prev, [lado]: prev[lado] === valor ? '' : valor }));
  };

  const adicionarObservacao = (evt: any) => {
    if (!modoObservacao) return;
    const { locationX, locationY } = evt.nativeEvent;
    const novoId = `obs_${Date.now()}`;
    const bx = locationX / IMAGE_WIDTH;
    const by = locationY / IMAGE_HEIGHT;
    setObservacoes(prev => ({
      ...prev,
      [novoId]: {
        base: { x: bx, y: by },
        ponta: { x: bx, y: by },
        centro: { x: bx, y: by },
        raio: RAIO_PADRAO,
      },
    }));
  };

  const moverCirculo = (id: string, x: number, y: number) => {
    setObservacoes(prev => {
      const atual = prev[id];
      if (!atual) return prev;
      const nx = Math.min(Math.max(x / IMAGE_WIDTH, 0), 1);
      const ny = Math.min(Math.max(y / IMAGE_HEIGHT, 0), 1);
      return { ...prev, [id]: { ...atual, centro: { x: nx, y: ny }, base: { x: nx, y: ny }, ponta: { x: nx, y: ny } } };
    });
  };

  const redimensionarCirculo = (id: string, raio: number) => {
    setObservacoes(prev => {
      const atual = prev[id];
      if (!atual) return prev;
      return { ...prev, [id]: { ...atual, raio } };
    });
  };

  const removerObservacao = (id: string) => {
    setObservacoes(prev => {
      const copia = { ...prev };
      delete copia[id];
      return copia;
    });
  };

  const salvarAvaliacao = async () => {
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const fotoPermanente = await salvarMidiaPermanente(fotoUri);
      db.runSync(
        `INSERT INTO avaliacoes_joelho
         (id_paciente, data_avaliacao, vista, foto_uri, pontos_json, medidas_json, cards_json, pisada_json, observacoes_json, dimensoes_json, achados_json, sem_cor, com_grade)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          pacienteId, dataHoje, vista, fotoPermanente,
          JSON.stringify(pontosEditaveis),
          JSON.stringify(medidas),
          JSON.stringify(cardsMarcados),
          JSON.stringify(pisada),
          JSON.stringify(observacoes),
          JSON.stringify({ largura: IMAGE_WIDTH, altura: IMAGE_HEIGHT }),
          JSON.stringify(achados),
          semCor ? 1 : 0,
          mostrarGrade ? 1 : 0,
        ]
      );
      const nova = db.getFirstSync('SELECT last_insert_rowid() as id') as { id: number };
      Alert.alert('Sucesso', 'Avaliacao salva! Deseja gerar o relatorio em PDF?', [
        { text: 'Agora nao', onPress: () => navigation.navigate('JoelhoHome') },
        {
          text: 'Gerar PDF',
          onPress: async () => {
            try {
              await gerarRelatorioJoelho(nova.id);
            } catch (e) {
              Alert.alert('Erro', 'Nao foi possivel gerar o PDF.');
            }
            navigation.navigate('JoelhoHome');
          },
        },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliacao de joelho:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a avaliacao.');
    }
  };

  const cardsDaVista = CARDS_POR_VISTA[vista] || [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{LABEL_VISTA[vista] || 'Resultado'}</Text>

      <View
        style={styles.imageContainer}
        onStartShouldSetResponderCapture={(evt: any) => {
          if (!modoObservacao) return false;
          const { locationX, locationY } = evt.nativeEvent;
          const sobreUmCirculo = Object.values(observacoes).some(o => {
            if (!o.centro) return false;
            const px = o.centro.x * IMAGE_WIDTH;
            const py = o.centro.y * IMAGE_HEIGHT;
            const r = o.raio || RAIO_PADRAO;
            const dx = locationX - px;
            const dy = locationY - py;
            return Math.sqrt(dx * dx + dy * dy) <= r + 8;
          });
          return !sobreUmCirculo;
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

        {(EIXOS_REFERENCIA[vista] || []).map(([idA, idB], i) => {
          const a = pontosEditaveis[idA];
          const b = pontosEditaveis[idB];
          if (!a || !b) return null;
          return (
            <LinhaEixo
              key={`eixo-${i}`}
              a={{ x: a.x * IMAGE_WIDTH, y: a.y * IMAGE_HEIGHT }}
              b={{ x: b.x * IMAGE_WIDTH, y: b.y * IMAGE_HEIGHT }}
            />
          );
        })}

        {(SEGMENTOS_VISTA[vista] || []).map(([idA, idB], i) => {
          const a = pontosEditaveis[idA];
          const b = pontosEditaveis[idB];
          if (!a || !b) return null;
          return (
            <LinhaSegmento
              key={`seg-${i}`}
              a={{ x: a.x * IMAGE_WIDTH, y: a.y * IMAGE_HEIGHT }}
              b={{ x: b.x * IMAGE_WIDTH, y: b.y * IMAGE_HEIGHT }}
            />
          );
        })}

        {Object.entries(pontosEditaveis).map(([id, p]) => (
          <MarcadorComLupa
            key={id}
            id={id}
            ponto={{ x: p.x * IMAGE_WIDTH, y: p.y * IMAGE_HEIGHT }}
            onMove={moverPonto}
            fotoUri={fotoUri}
            larguraImagem={IMAGE_WIDTH}
            alturaImagem={IMAGE_HEIGHT}
          />
        ))}

        {Object.entries(observacoes).map(([id, o]) => (
          o.centro ? (
            <CirculoDestaque
              key={id}
              id={id}
              centro={{ x: o.centro.x * IMAGE_WIDTH, y: o.centro.y * IMAGE_HEIGHT }}
              raio={o.raio || RAIO_PADRAO}
              onMover={moverCirculo}
              onRedimensionar={redimensionarCirculo}
              onLongPress={removerObservacao}
            />
          ) : null
        ))}
      </View>

      <Text style={styles.sectionTitle}>Medidas</Text>
      {medidas.length === 0 ? (
        <Text style={styles.semDados}>Marque os pontos para calcular.</Text>
      ) : (
        medidas.map(m => (
          <View key={m.label} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>{m.label}</Text>
              <Text style={styles.cardRef}>{m.descricao}</Text>
            </View>
            <View style={[
              styles.badge,
              m.classificacao === 'alterado' ? styles.badgeVermelho
                : m.classificacao === 'discreto' ? styles.badgeAlerta
                : styles.badgeOk,
            ]}>
              <Text style={[
                styles.badgeText,
                m.classificacao === 'alterado' ? styles.badgeTextVermelho
                  : m.classificacao === 'discreto' ? styles.badgeTextAlerta
                  : styles.badgeTextOk,
              ]}>
                {m.valor}{m.unidade}
              </Text>
            </View>
          </View>
        ))
      )}

      {vista === 'retrope' && (
        <>
          <Text style={styles.sectionTitle}>Classificacao da Pisada</Text>
          {['Pe direito', 'Pe esquerdo'].map(lado => (
            <View key={lado} style={styles.blocoPisada}>
              <Text style={styles.pisadaRotulo}>{lado}</Text>
              <View style={styles.linhaOpcoes}>
                {OPCOES_PISADA.map(op => (
                  <TouchableOpacity
                    key={op}
                    style={[styles.opcaoPisada, pisada[lado] === op && styles.opcaoPisadaAtiva]}
                    onPress={() => escolherPisada(lado, op)}
                  >
                    <Text style={[styles.opcaoTexto, pisada[lado] === op && styles.opcaoTextoAtivo]}>{op}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </>
      )}

      {cardsDaVista.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Achados Clinicos</Text>
          <View style={styles.cardsClinicos}>
            {cardsDaVista.map(card => {
              const marcado = cardsMarcados.includes(card);
              return (
                <TouchableOpacity
                  key={card}
                  style={[styles.cardClinico, marcado && styles.cardClinicoAtivo]}
                  onPress={() => alternarCard(card)}
                >
                  <Text style={[styles.cardClinicoTexto, marcado && styles.cardClinicoTextoAtivo]}>{card}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {vista !== 'retrope' && (
        <>
      <Text style={styles.sectionTitle}>Achados Clinicos Complementares</Text>
      <View style={styles.blocoAchados}>
        <Image
          source={require('../../../assets/referencias/achados-joelho.jpg')}
          style={styles.imagemAchados}
          resizeMode="contain"
        />
        <Text style={styles.ajudaAchados}>
          Toque no achado observado e escolha o lado. Toque de novo para desmarcar.
          O item 13 nao tem ilustracao.
        </Text>

        <View style={styles.gradeChips}>
          {ACHADOS_JOELHO.map((nome, i) => {
            const numero = i + 1;
            const marcado = achados[numero];
            return (
              <View key={numero} style={styles.chipArea}>
                <TouchableOpacity
                  style={[styles.chip, marcado ? styles.chipAtivo : null]}
                  onPress={() => alternarAchado(numero)}
                >
                  <Text style={[styles.chipNumero, marcado ? styles.chipTextoAtivo : null]}>{numero}</Text>
                  <Text style={[styles.chipNome, marcado ? styles.chipTextoAtivo : null]} numberOfLines={2}>
                    {nome}
                  </Text>
                  {marcado ? <Text style={styles.chipLado}>{marcado}</Text> : null}
                </TouchableOpacity>

                {achadoAberto === numero && (
                  <View style={styles.linhaLados}>
                    {LADOS_ACHADO.map(lado => (
                      <TouchableOpacity
                        key={lado}
                        style={styles.botaoLado}
                        onPress={() => escolherLadoAchado(numero, lado)}
                      >
                        <Text style={styles.botaoLadoTexto}>{lado}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
        </>
      )}

      <View style={styles.barraVisual}>
        <TouchableOpacity
          style={[styles.btnVisual, mostrarGrade && styles.btnVisualAtivo]}
          onPress={() => setMostrarGrade(!mostrarGrade)}
        >
          <Text style={[styles.btnVisualTexto, mostrarGrade && styles.btnVisualTextoAtivo]}>Grade</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnVisual, semCor && styles.btnVisualAtivo]}
          onPress={() => setSemCor(!semCor)}
        >
          <Text style={[styles.btnVisualTexto, semCor && styles.btnVisualTextoAtivo]}>Preto e branco</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.btnObservacao, modoObservacao && styles.btnObservacaoAtivo]}
        onPress={() => setModoObservacao(!modoObservacao)}
      >
        <Text style={[styles.btnObservacaoText, modoObservacao && styles.btnObservacaoTextAtivo]}>
          {modoObservacao ? 'Marcando - toque na foto' : 'Marcar observacao'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnRestaurar} onPress={restaurarPontos}>
        <Text style={styles.btnRestaurarText}>Restaurar posicoes originais</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSalvar} onPress={salvarAvaliacao}>
        <Text style={styles.btnSalvarText}>Salvar no Historico do Paciente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function LinhaSegmento({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const angulo = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View
      pointerEvents="none"
      style={[styles.linhaSegmento, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: `${angulo}deg` }] }]}
    />
  );
}

/** Eixo tracejado entre os pontos extremos: mostra o sentido do desvio. */
function LinhaEixo({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const angulo = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return (
    <View
      pointerEvents="none"
      style={[styles.linhaEixo, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: `${angulo}deg` }] }]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12, marginTop: 8 },
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  imagemSemCor: { opacity: 0.35 },
  camadaSemCor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', opacity: 0.12 },
  gradeLinhaV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  gradeLinhaH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.25)' },
  barraVisual: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btnVisual: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnVisualAtivo: { backgroundColor: '#DBEAFE', borderColor: '#0284C7' },
  btnVisualTexto: { fontSize: 12, color: '#475569', fontWeight: '600' },
  btnVisualTextoAtivo: { color: '#0369A1', fontWeight: '700' },
  linhaSegmento: { position: 'absolute', height: 2.5, backgroundColor: '#4ADE80', transformOrigin: 'left' },
  linhaEixo: { position: 'absolute', height: 0, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.7)', transformOrigin: 'left' },
  semDados: { color: '#94A3B8', textAlign: 'center', padding: 20 },
  card: { backgroundColor: '#FFFFFF', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#334155', fontSize: 14, fontWeight: '600' },
  cardRef: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, minWidth: 70, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeVermelho: { backgroundColor: '#FEE2E2' },
  badgeText: { fontWeight: 'bold', fontSize: 13 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  badgeTextVermelho: { color: '#DC2626' },
  blocoPisada: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  pisadaRotulo: { fontSize: 13, fontWeight: '700', color: '#334155', marginBottom: 8 },
  linhaOpcoes: { flexDirection: 'row', gap: 8 },
  opcaoPisada: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  opcaoPisadaAtiva: { backgroundColor: '#DBEAFE', borderColor: '#0284C7' },
  opcaoTexto: { fontSize: 12, color: '#475569', fontWeight: '600' },
  opcaoTextoAtivo: { color: '#0369A1', fontWeight: '700' },
  cardsClinicos: { gap: 8, marginBottom: 12 },
  cardClinico: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  cardClinicoAtivo: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  cardClinicoTexto: { fontSize: 13, color: '#334155' },
  cardClinicoTextoAtivo: { color: '#B91C1C', fontWeight: '700' },
  blocoAchados: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  imagemAchados: { width: '100%', height: 260, borderRadius: 10 },
  ajudaAchados: { fontSize: 11, color: '#64748B', lineHeight: 16, marginTop: 8, marginBottom: 10 },
  gradeChips: { gap: 6 },
  chipArea: { marginBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  chipAtivo: { backgroundColor: '#FEE2E2', borderColor: '#DC2626' },
  chipNumero: { fontSize: 12, fontWeight: '700', color: '#64748B', minWidth: 18 },
  chipNome: { fontSize: 12, color: '#334155', flex: 1 },
  chipTextoAtivo: { color: '#B91C1C', fontWeight: '700' },
  chipLado: { fontSize: 11, fontWeight: '700', color: '#B91C1C' },
  linhaLados: { flexDirection: 'row', gap: 6, marginTop: 6 },
  botaoLado: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  botaoLadoTexto: { fontSize: 11, color: '#475569', fontWeight: '600' },
  btnObservacao: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#FCA5A5' },
  btnObservacaoAtivo: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  btnObservacaoText: { color: '#EF4444', fontWeight: 'bold', fontSize: 13 },
  btnObservacaoTextAtivo: { color: '#B91C1C' },
  btnRestaurar: { backgroundColor: '#F1F5F9', padding: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  btnRestaurarText: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
