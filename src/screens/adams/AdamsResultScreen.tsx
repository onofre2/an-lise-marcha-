import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Alert, Dimensions, TextInput } from 'react-native';
import db from '../../services/database';
import { gerarAchadosAdams } from '../../services/interpretacaoClinica';
import { salvarMidiaPermanente } from '../../services/armazenamento';
import { gerarRelatorioAdams } from '../../services/pdfService';
import { Observacao } from '../../services/observacoes';
import SetaDesajuste from '../../components/SetaDesajuste';
import MarcadorComLupa from '../../components/MarcadorComLupa';

interface Ponto { x: number; y: number; }

const IMAGE_HEIGHT = Dimensions.get('window').height * 0.5;
const IMAGE_WIDTH = Dimensions.get('window').width - 32;

// Limiar de alerta em graus. Mesmo criterio dos demais alinhamentos do app.
const LIMIAR = 5;

export default function AdamsResultScreen({ route, navigation }: any) {
  const { fotoUri, pacienteId, pontos, vista = 'posterior' } = route.params as {
    fotoUri: string; pacienteId: number; pontos: Record<string, Ponto>;
    vista?: 'posterior' | 'lateral';
  };

  // Altura do paciente: converte a gibosidade de pixel para centimetros.
  const alturaCm = useMemo(() => {
    try {
      const row = db.getFirstSync('SELECT altura_cm FROM pacientes WHERE id = ?', [pacienteId]) as { altura_cm: number | null } | null;
      return row?.altura_cm ?? null;
    } catch {
      return null;
    }
  }, [pacienteId]);

  const [pontosEditaveis, setPontosEditaveis] = useState<Record<string, Ponto>>(pontos);

  // useState so aplica o valor inicial na primeira montagem. Quando a tela e
  // reaproveitada para outra avaliacao, os pontos da anterior permaneceriam.
  // A chave ressincroniza o estado sem forcar remontagem.
  const chaveAvaliacao = String(fotoUri);
  const chaveAnterior = React.useRef(chaveAvaliacao);
  useEffect(() => {
    if (chaveAnterior.current !== chaveAvaliacao) {
      chaveAnterior.current = chaveAvaliacao;
      setPontosEditaveis(pontos);
      setObservacoes({});
    }
  }, [chaveAvaliacao, pontos]);

  // Os pontos sao gravados normalizados (0 a 1). O angulo so e correto em
  // pixel: a area nao e quadrada, entao o espaco normalizado distorce.
  const pontosPx = React.useMemo(() => {
    const out: Record<string, Ponto> = {};
    for (const [id, pt] of Object.entries(pontosEditaveis)) {
      out[id] = { x: pt.x * IMAGE_WIDTH, y: pt.y * IMAGE_HEIGHT };
    }
    return out;
  }, [pontosEditaveis]);
  const [observacoes, setObservacoes] = useState<Record<string, Observacao>>({});
  const [modoObservacao, setModoObservacao] = useState(false);
  const [mostrarGrade, setMostrarGrade] = useState(false);
  const [semCor, setSemCor] = useState(false);

  // Registro do exame clinico feito pelo terapeuta, ao lado da medida
  // fotogrametrica. Nao altera o achado calculado pela foto.
  const [exame, setExame] = useState<Record<string, string>>({ resultado: 'Nao realizado' });
  const definir = (chave: string, valor: string) =>
    setExame(prev => ({ ...prev, [chave]: prev[chave] === valor ? '' : valor }));

  const moverPonto = (id: string, x: number, y: number) => {
    const nx = Math.min(Math.max(x / IMAGE_WIDTH, 0), 1);
    const ny = Math.min(Math.max(y / IMAGE_HEIGHT, 0), 1);
    setPontosEditaveis(prev => ({ ...prev, [id]: { x: nx, y: ny } }));
  };

  const restaurarPontos = () => setPontosEditaveis(pontos);

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

  // Vista lateral: altura da gibosidade, medida como a distancia perpendicular
  // do apice ate a linha C7-L5. Em centimetros quando ha altura cadastrada;
  // caso contrario, em porcentagem do proprio segmento C7-L5.
  const resultadoLateral = useMemo(() => {
    if (vista !== 'lateral') return null;
    const c7 = pontosPx.c7;
    const apice = pontosPx.apice;
    const l5 = pontosPx.l5;
    if (!c7 || !apice || !l5) return null;

    const dx = l5.x - c7.x;
    const dy = l5.y - c7.y;
    const comprimento = Math.sqrt(dx * dx + dy * dy);
    if (comprimento === 0) return null;

    // Distancia ponto-reta: area do paralelogramo dividida pela base.
    const distancia = Math.abs(dy * apice.x - dx * apice.y + l5.x * c7.y - l5.y * c7.x) / comprimento;
    const percentual = Number(((distancia / comprimento) * 100).toFixed(1));

    let cm: number | null = null;
    if (alturaCm && alturaCm > 0) {
      // O segmento C7-L5 corresponde a cerca de 30% da estatura.
      const cmPorUnidade = (alturaCm * 0.30) / comprimento;
      cm = Number((distancia * cmPorUnidade).toFixed(1));
    }
    return { distancia, percentual, cm, alerta: (cm !== null ? cm >= 1 : percentual >= 5) };
  }, [pontosEditaveis, vista, alturaCm]);


  // Angulo de inclinacao entre os dois lados do dorso, em relacao a horizontal
  const resultado = useMemo(() => {
    const d = pontosPx.dorso_d;
    const e = pontosPx.dorso_e;
    if (!d || !e) return null;

    const dx = Math.abs(e.x - d.x);
    const dy = Math.abs(e.y - d.y);
    if (dx === 0) return null;

    const angulo = Number((Math.atan2(dy, dx) * (180 / Math.PI)).toFixed(1));
    // No eixo da tela, y menor significa mais alto na imagem
    const ladoElevado = d.y < e.y ? 'Direito' : 'Esquerdo';

    return { angulo, ladoElevado, alerta: angulo >= LIMIAR };
  }, [pontosEditaveis]);

  // Gibosidade em centimetros: na lateral vem do resultado; na posterior,
  // convertida a partir da assimetria entre os lados quando ha altura.
  const achadosAdams = useMemo(() => {
    let cm: number | null = null;
    if (vista === 'lateral') {
      cm = resultadoLateral ? resultadoLateral.cm : null;
    } else if (resultado && alturaCm && alturaCm > 0) {
      // Desnivel vertical entre os dois lados do dorso, convertido para
      // centimetros: a largura entre os pontos serve de regua, tomada como
      // cerca de 20% da altura do paciente.
      const d = pontosPx.dorso_d;
      const e = pontosPx.dorso_e;
      if (d && e) {
        const largura = Math.abs(e.x - d.x);
        const desnivel = Math.abs(e.y - d.y);
        if (largura > 0) {
          const cmPorUnidade = (alturaCm * 0.20) / largura;
          cm = Number((desnivel * cmPorUnidade).toFixed(1));
        }
      }
    }
    if (cm === null) return [];
    const lado = resultado ? resultado.ladoElevado : null;
    return gerarAchadosAdams(cm, lado, null, vista === 'lateral');
  }, [vista, resultadoLateral, resultado, alturaCm, pontosPx]);

  const salvarAvaliacao = async () => {
    if (vista === 'lateral' ? !resultadoLateral : !resultado) {
      Alert.alert('Erro', 'Marque todos os pontos antes de salvar.');
      return;
    }
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      const fotoPermanente = await salvarMidiaPermanente(fotoUri);
      db.runSync(
        'INSERT INTO avaliacoes_adams (id_paciente, data_avaliacao, foto_uri, pontos_json, angulo, lado_elevado, observacoes_json, dimensoes_json, vista, gibosidade_cm, gibosidade_pct, sem_cor, com_grade, achados_json, exame_clinico_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pacienteId, dataHoje, fotoPermanente, JSON.stringify(pontosEditaveis),
          resultado ? resultado.angulo : null,
          resultado ? resultado.ladoElevado : null,
          JSON.stringify(observacoes),
          JSON.stringify({ largura: IMAGE_WIDTH, altura: IMAGE_HEIGHT }),
          vista,
          resultadoLateral ? resultadoLateral.cm : null,
          resultadoLateral ? resultadoLateral.percentual : null,
          semCor ? 1 : 0,
          mostrarGrade ? 1 : 0,
          JSON.stringify(achadosAdams),
          JSON.stringify(exame),
        ]
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


        {/* Vista posterior: eixo ideal vertical no meio das gibosidades e eixo
            real ligando os dois lados, mostrando para onde a curva tende. */}
        {vista !== 'lateral' && pontosPx.dorso_d && pontosPx.dorso_e && (
          <View
            pointerEvents="none"
            style={[styles.eixoIdeal, { left: (pontosPx.dorso_d.x + pontosPx.dorso_e.x) / 2 }]}
          />
        )}
        {vista !== 'lateral' && pontosPx.dorso_d && pontosPx.dorso_e && (() => {
          const a = pontosPx.dorso_d;
          const b = pontosPx.dorso_e;
          const alto = a.y <= b.y ? a : b;
          const baixo = a.y <= b.y ? b : a;
          const dy = baixo.y - alto.y;
          const inc = dy === 0 ? 0 : (baixo.x - alto.x) / dy;
          const xTopo = alto.x + (0 - alto.y) * inc;
          const xBase = alto.x + (IMAGE_HEIGHT - alto.y) * inc;
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

        {vista === 'lateral' && pontosPx.c7 && pontosPx.l5 && (
          <LinhaDorso a={pontosPx.c7} b={pontosPx.l5} alerta={false} />
        )}

        {vista === 'lateral' && pontosPx.c7 && pontosPx.l5 && pontosPx.apice && (() => {
          // Perpendicular do apice ate a linha C7-L5: e essa distancia que
          // representa a altura da gibosidade.
          const c7 = pontosPx.c7;
          const l5 = pontosPx.l5;
          const ap = pontosPx.apice;
          const dx = l5.x - c7.x;
          const dy = l5.y - c7.y;
          const comp2 = dx * dx + dy * dy;
          if (comp2 === 0) return null;
          const t = ((ap.x - c7.x) * dx + (ap.y - c7.y) * dy) / comp2;
          const pe = { x: c7.x + t * dx, y: c7.y + t * dy };
          return <LinhaDorso a={ap} b={pe} alerta={resultadoLateral ? resultadoLateral.alerta : false} />;
        })()}

        {pontosPx.dorso_d && pontosPx.dorso_e && (
          <>
            <LinhaReferencia a={pontosPx.dorso_d} b={pontosPx.dorso_e} />
            <LinhaDorso a={pontosPx.dorso_d} b={pontosPx.dorso_e} alerta={resultado ? resultado.alerta : false} />
            {resultado && (
              <BadgeNaLinha
                a={pontosPx.dorso_d}
                b={pontosPx.dorso_e}
                valor={resultado.angulo}
                alerta={resultado.alerta}
              />
            )}
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

      {achadosAdams.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Diagnóstico Clínico Sugerido</Text>
          {achadosAdams.map((a, i) => (
            <View key={i} style={[styles.cardAchado, a.alerta && styles.cardAchadoAlerta]}>
              <Text style={styles.cardAchadoTitulo}>{a.titulo}</Text>
              <Text style={styles.cardAchadoTexto}>{a.descricao}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>Registro do Exame Clínico</Text>
      <View style={styles.blocoExame}>
        <Text style={styles.exameRotulo}>Resultado do teste</Text>
        <View style={styles.linhaOpcoes}>
          {['Nao realizado', 'Negativo', 'Positivo'].map(op => (
            <TouchableOpacity
              key={op}
              style={[styles.opcaoExame, exame.resultado === op && styles.opcaoExameAtiva]}
              onPress={() => definir('resultado', op)}
            >
              <Text style={[styles.opcaoExameTexto, exame.resultado === op && styles.opcaoExameTextoAtivo]}>{op}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.exameRotulo}>Localização da assimetria</Text>
        <View style={styles.linhaOpcoes}>
          {['Torácica', 'Toracolombar', 'Lombar'].map(op => (
            <TouchableOpacity
              key={op}
              style={[styles.opcaoExame, exame.localizacao === op && styles.opcaoExameAtiva]}
              onPress={() => definir('localizacao', op)}
            >
              <Text style={[styles.opcaoExameTexto, exame.localizacao === op && styles.opcaoExameTextoAtivo]}>{op}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.exameRotulo}>Lado da gibosidade</Text>
        <View style={styles.linhaOpcoes}>
          {['Direita', 'Esquerda'].map(op => (
            <TouchableOpacity
              key={op}
              style={[styles.opcaoExame, exame.lado === op && styles.opcaoExameAtiva]}
              onPress={() => definir('lado', op)}
            >
              <Text style={[styles.opcaoExameTexto, exame.lado === op && styles.opcaoExameTextoAtivo]}>{op}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.exameRotulo}>Escoliômetro (graus)</Text>
        <TextInput
          style={styles.campoExame}
          value={exame.escoliometro || ''}
          onChangeText={t => setExame(prev => ({ ...prev, escoliometro: t }))}
          keyboardType="numeric"
          placeholder="Ex: 7"
          placeholderTextColor="#94A3B8"
        />
        <Text style={styles.exameNota}>
          Referência: positivo a partir de 7 graus, ou 5 graus quando o índice de
          massa corporal está no percentil 85 ou acima.
        </Text>

        <Text style={styles.exameRotulo}>Observação clínica</Text>
        <TextInput
          style={[styles.campoExame, styles.campoExameAlto]}
          value={exame.observacao || ''}
          onChangeText={t => setExame(prev => ({ ...prev, observacao: t }))}
          multiline
          placeholderTextColor="#94A3B8"
        />
      </View>

      <Text style={styles.sectionTitle}>Resultado</Text>
      {vista === 'lateral' ? (
        !resultadoLateral ? (
          <Text style={styles.semDados}>Marque C7, o apice e L5 para calcular.</Text>
        ) : (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Altura da gibosidade</Text>
              <Text style={styles.cardRef}>
                {resultadoLateral.cm !== null
                  ? 'Alerta a partir de 1 cm'
                  : 'Sem altura cadastrada: valor relativo ao segmento C7-L5'}
              </Text>
            </View>
            <View style={[styles.badge, resultadoLateral.alerta ? styles.badgeAlerta : styles.badgeOk]}>
              <Text style={[styles.badgeText, resultadoLateral.alerta ? styles.badgeTextAlerta : styles.badgeTextOk]}>
                {resultadoLateral.cm !== null ? `${resultadoLateral.cm} cm` : `${resultadoLateral.percentual}%`}
              </Text>
            </View>
          </View>
        )
      ) : !resultado ? (
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

/**
 * Duas horizontais de referencia: verde no ponto mais baixo e vermelha no mais
 * alto. A distancia entre elas e a gibosidade, visivel de imediato.
 */
function LinhaReferencia({ a, b }: { a: Ponto; b: Ponto }) {
  const esquerda = Math.min(a.x, b.x) - 20;
  const largura = Math.abs(b.x - a.x) + 40;
  // Em coordenadas de tela, y maior significa mais baixo na imagem.
  const yBaixo = Math.max(a.y, b.y);
  const yAlto = Math.min(a.y, b.y);
  return (
    <>
      <View style={[styles.linhaRefBaixa, { left: esquerda, top: yBaixo, width: largura }]} />
      <View style={[styles.linhaRefAlta, { left: esquerda, top: yAlto, width: largura }]} />
    </>
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
  blocoExame: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: '#E2E8F0' },
  exameRotulo: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 6, marginTop: 6 },
  linhaOpcoes: { flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  opcaoExame: { flex: 1, minWidth: 90, paddingVertical: 8, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  opcaoExameAtiva: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  opcaoExameTexto: { fontSize: 12, color: '#475569', fontWeight: '600' },
  opcaoExameTextoAtivo: { color: '#FFFFFF' },
  campoExame: { backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#0F172A' },
  campoExameAlto: { minHeight: 70, textAlignVertical: 'top' },
  exameNota: { fontSize: 11, color: '#94A3B8', marginTop: 6, lineHeight: 15 },
  cardAchado: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#94A3B8' },
  cardAchadoAlerta: { backgroundColor: '#FFFBEB', borderLeftColor: '#F59E0B' },
  cardAchadoTitulo: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  cardAchadoTexto: { fontSize: 13, color: '#475569', lineHeight: 18 },
  barraVisual: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  btnVisual: { flex: 1, backgroundColor: '#E0F2FE', paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#7DD3FC' },
  btnVisualAtivo: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
  btnVisualText: { color: '#0369A1', fontWeight: '700', fontSize: 13 },
  btnVisualTextAtivo: { color: '#FFFFFF' },
  imagemSemCor: { opacity: 0.55 },
  camadaSemCor: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFFFFF', opacity: 0.18 },
  eixoIdeal: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: '#22C55E' },
  eixoReal: { position: 'absolute', height: 2, backgroundColor: '#EF4444' },
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
  imageContainer: { height: IMAGE_HEIGHT, backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  linha: { position: 'absolute', height: 3, transformOrigin: 'left' },
  linhaOk: { backgroundColor: '#4ADE80' },
  linhaAlerta: { backgroundColor: '#F59E0B' },
  linhaRefBaixa: { position: 'absolute', height: 2, backgroundColor: '#22C55E' },
  linhaRefAlta: { position: 'absolute', height: 2, backgroundColor: '#EF4444' },
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
