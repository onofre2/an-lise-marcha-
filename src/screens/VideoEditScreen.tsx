import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ScrollView } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import db from '../services/database';
import { FASES_MARCHA, PONTOS_FASE } from '../constants/fasesMarcha';
import { calcularFase, PontosFase } from '../services/marchaCalculations';

const VIDEO_HEIGHT = Dimensions.get('window').height * 0.38;

export default function VideoEditScreen({ route, navigation }: any) {
  const { videoUri, pacienteId, angulo } = route.params as {
    videoUri: string; pacienteId: number; angulo: string;
  };

  const player = useVideoPlayer(videoUri, p => {
    p.loop = true;
    p.timeUpdateEventInterval = 0.1;
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const timeUpdate = useEvent(player, 'timeUpdate');
  const currentTime = timeUpdate ? timeUpdate.currentTime : 0;

  const [rate, setRate] = useState(1.0);
  const [faseIndice, setFaseIndice] = useState(0);
  const [pontosFaseAtual, setPontosFaseAtual] = useState<PontosFase>({});
  const [marcacoes, setMarcacoes] = useState<Record<string, PontosFase>>({});

  const fase = FASES_MARCHA[faseIndice];
  const pontoIndice = Object.keys(pontosFaseAtual).length;
  const pontoAtual = pontoIndice < PONTOS_FASE.length ? PONTOS_FASE[pontoIndice] : null;
  const faseCompleta = pontoAtual === null;
  const todasFasesFeitas = Object.keys(marcacoes).length === FASES_MARCHA.length;

  const alternarPlayPause = () => {
    if (isPlaying) player.pause();
    else player.play();
  };

  const pular = (segundos: number) => {
    player.pause();
    const nova = Math.max(0, currentTime + segundos);
    player.currentTime = nova;
  };

  const alterarVelocidade = (v: number) => {
    setRate(v);
    player.playbackRate = v;
  };

  const marcarPonto = (evt: any) => {
    if (faseCompleta) return;
    const { locationX, locationY } = evt.nativeEvent;
    setPontosFaseAtual(prev => ({ ...prev, [pontoAtual!.id]: { x: locationX, y: locationY } }));
  };

  const limparFase = () => setPontosFaseAtual({});

  const confirmarFase = () => {
    setMarcacoes({ ...marcacoes, [fase.id]: pontosFaseAtual });
    setPontosFaseAtual({});
    if (faseIndice < FASES_MARCHA.length - 1) setFaseIndice(faseIndice + 1);
  };

  const salvar = () => {
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      db.runSync(
        'INSERT INTO avaliacoes (id_paciente, angulo, data_avaliacao, video_uri) VALUES (?, ?, ?, ?)',
        [pacienteId, angulo, dataHoje, videoUri]
      );
      Alert.alert('Sucesso', 'Avaliacao de marcha salva no historico!', [
        { text: 'OK', onPress: () => navigation.navigate('EvaluationHome') },
      ]);
    } catch (error) {
      console.error('Erro ao salvar marcha:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a avaliacao.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.videoContainer}>
        <VideoView player={player} style={styles.video} contentFit="contain" nativeControls={false} />
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={marcarPonto}>
          {Object.entries(pontosFaseAtual).map(([id, p]) => (
            <View key={id} style={[styles.marcador, { left: p.x - 8, top: p.y - 8 }]} />
          ))}
          <Segmentos pontos={pontosFaseAtual} />
        </TouchableOpacity>
      </View>

      <View style={styles.controles}>
        <TouchableOpacity style={styles.btnCtrl} onPress={() => pular(-0.1)}>
          <Text style={styles.btnCtrlText}>-0,1s</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnCtrl} onPress={alternarPlayPause}>
          <Text style={styles.btnCtrlText}>{isPlaying ? 'Pausar' : 'Play'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnCtrl} onPress={() => pular(0.1)}>
          <Text style={styles.btnCtrlText}>+0,1s</Text>
        </TouchableOpacity>
        <View style={styles.tempo}><Text style={styles.tempoText}>{currentTime.toFixed(1)}s</Text></View>
      </View>

      <View style={styles.rowVel}>
        {[1.0, 0.5, 0.3].map(v => (
          <TouchableOpacity key={v} style={[styles.btnVel, rate === v && styles.btnVelAtivo]} onPress={() => alterarVelocidade(v)}>
            <Text style={[styles.btnVelText, rate === v && styles.btnVelTextAtivo]}>{v === 1.0 ? '1x' : v === 0.5 ? '2x Lento' : '3x Lento'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!todasFasesFeitas ? (
        <View style={styles.cardFase}>
          <Text style={styles.faseNome}>{fase.nome}</Text>
          <Text style={styles.faseDesc}>{fase.descricao}</Text>
          {pontoAtual ? (
            <Text style={styles.instrucao}>Avance ate a fase e toque em: {pontoAtual.nome}</Text>
          ) : (
            <Text style={styles.instrucao}>Todos os pontos marcados nesta fase.</Text>
          )}
          <View style={styles.badgeProgresso}>
            <Text style={styles.badgeProgressoText}>{pontoIndice}/{PONTOS_FASE.length} pontos</Text>
          </View>
          <View style={styles.rowBtns}>
            <TouchableOpacity style={styles.btnSec} onPress={limparFase}>
              <Text style={styles.btnSecText}>Limpar</Text>
            </TouchableOpacity>
            {faseCompleta && (
              <TouchableOpacity style={styles.btnPri} onPress={confirmarFase}>
                <Text style={styles.btnPriText}>Confirmar Fase</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View>
          <ResumoMarcha marcacoes={marcacoes} />
          <Text style={styles.tituloResultado}>Resultado por Fase</Text>
          {FASES_MARCHA.map(f => (
            <View key={f.id} style={styles.blocoFase}>
              <Text style={styles.blocoFaseNome}>{f.nome}</Text>
              {calcularFase(f.id, marcacoes[f.id] || {}).map((r, i) => (
                <View key={i} style={styles.linhaRes}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resNome}>{r.nome}</Text>
                    <Text style={styles.resRef}>Esperado: {r.referencia}</Text>
                  </View>
                  <View style={[styles.badge, r.dentroFaixa ? styles.badgeOk : styles.badgeAlerta]}>
                    <Text style={[styles.badgeText, r.dentroFaixa ? styles.badgeTextOk : styles.badgeTextAlerta]}>{r.valor} graus</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
          <TouchableOpacity style={styles.btnSalvar} onPress={salvar}>
            <Text style={styles.btnSalvarText}>Salvar no Historico do Paciente</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function ResumoMarcha({ marcacoes }: { marcacoes: Record<string, PontosFase> }) {
  const todosResultados = FASES_MARCHA.flatMap(f => calcularFase(f.id, marcacoes[f.id] || {}));
  const alterados = todosResultados.filter(r => !r.dentroFaixa);

  if (todosResultados.length === 0) return null;

  const alerta = alterados.length > 0;
  const texto = alerta
    ? `${alterados.length} parametro${alterados.length > 1 ? 's' : ''} fora da faixa esperada: ${alterados.map(a => a.nome.toLowerCase()).join(', ')}. Recomenda-se avaliacao clinica complementar.`
    : 'Todos os parametros analisados estao dentro da faixa esperada para as fases avaliadas.';

  return (
    <View style={[styles.resumoCard, alerta ? styles.resumoAlerta : styles.resumoOk]}>
      <Text style={[styles.resumoTexto, alerta ? styles.resumoTextoAlerta : styles.resumoTextoOk]}>{texto}</Text>
    </View>
  );
}

function Segmentos({ pontos }: { pontos: PontosFase }) {
  const pares: [string, string][] = [
    ['tronco', 'quadril'],
    ['quadril', 'joelho'],
    ['joelho', 'tornozelo'],
    ['tornozelo', 'pe'],
  ];
  return (
    <>
      {pares.map(([a, b], i) => {
        const pa = pontos[a];
        const pb = pontos[b];
        if (!pa || !pb) return null;
        const comp = Math.sqrt((pb.x - pa.x) ** 2 + (pb.y - pa.y) ** 2);
        const rot = Math.atan2(pb.y - pa.y, pb.x - pa.x) * (180 / Math.PI);
        return <View key={i} style={[styles.linha, { left: pa.x, top: pa.y, width: comp, transform: [{ rotate: rot + 'deg' }] }]} />;
      })}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  resumoCard: { padding: 14, borderRadius: 14, marginBottom: 16, borderWidth: 1 },
  resumoOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  resumoAlerta: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  resumoTexto: { fontSize: 13, lineHeight: 19 },
  resumoTextoOk: { color: '#166534' },
  resumoTextoAlerta: { color: '#92400E' },
  content: { padding: 16, paddingBottom: 40 },
  videoContainer: { width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#000', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  video: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', width: '100%', height: '100%' },
  marcador: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 2, backgroundColor: '#4ADE80', transformOrigin: 'left' },
  controles: { flexDirection: 'row', gap: 6, marginBottom: 10, alignItems: 'center' },
  btnCtrl: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 11, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnCtrlText: { color: '#0F172A', fontWeight: 'bold', fontSize: 12 },
  tempo: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10 },
  tempoText: { color: '#64748B', fontWeight: 'bold', fontSize: 12 },
  rowVel: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  btnVel: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnVelAtivo: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  btnVelText: { color: '#475569', fontWeight: 'bold', fontSize: 12 },
  btnVelTextAtivo: { color: '#FFFFFF' },
  cardFase: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  faseNome: { fontSize: 17, fontWeight: 'bold', color: '#0F172A' },
  faseDesc: { fontSize: 12, color: '#94A3B8', marginTop: 3, marginBottom: 12 },
  instrucao: { fontSize: 14, color: '#16A34A', fontWeight: '600', marginBottom: 10 },
  badgeProgresso: { backgroundColor: '#DCFCE7', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 14 },
  badgeProgressoText: { color: '#16A34A', fontWeight: 'bold', fontSize: 12 },
  rowBtns: { flexDirection: 'row', gap: 10 },
  btnSec: { flex: 1, backgroundColor: '#F1F5F9', padding: 13, borderRadius: 11, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  btnSecText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
  btnPri: { flex: 2, backgroundColor: '#22C55E', padding: 13, borderRadius: 11, alignItems: 'center' },
  btnPriText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  tituloResultado: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  blocoFase: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  blocoFaseNome: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  linhaRes: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  resNome: { fontSize: 13, color: '#334155', fontWeight: '600' },
  resRef: { fontSize: 11, color: '#94A3B8', marginTop: 1 },
  badge: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, minWidth: 74, alignItems: 'center' },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeAlerta: { backgroundColor: '#FEF3C7' },
  badgeText: { fontWeight: 'bold', fontSize: 12 },
  badgeTextOk: { color: '#16A34A' },
  badgeTextAlerta: { color: '#D97706' },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 6 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});
