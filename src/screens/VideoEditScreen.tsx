import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import db from '../services/database';

interface Ponto { x: number; y: number; }

const VIDEO_HEIGHT = Dimensions.get('window').height * 0.4;

export default function VideoEditScreen({ route, navigation }: any) {
  const { videoUri, pacienteId, angulo } = route.params as {
    videoUri: string; pacienteId: number; angulo: string;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [pontos, setPontos] = useState<Ponto[]>([]);

  const videoRef = useRef<Video>(null);

  const alterarVelocidade = async (velocidade: number) => {
    setRate(velocidade);
    if (videoRef.current) {
      await videoRef.current.setRateAsync(velocidade, true);
    }
  };

  const alternarPlayPause = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      await videoRef.current.pauseAsync();
    } else {
      await videoRef.current.playAsync();
    }
  };

  const onStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
    }
  };

  const marcarPonto = (evt: any) => {
    if (pontos.length >= 3) return;
    const { locationX, locationY } = evt.nativeEvent;
    setPontos(prev => [...prev, { x: locationX, y: locationY }]);
  };

  const limparPontos = () => setPontos([]);

  const anguloCalculado = (): number | null => {
    if (pontos.length < 3) return null;
    const [a, vertice, c] = pontos;
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
  };

  const salvar = () => {
    try {
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      db.runSync(
        'INSERT INTO avaliacoes (id_paciente, angulo, data_avaliacao, video_uri) VALUES (?, ?, ?, ?)',
        [pacienteId, angulo, dataHoje, videoUri]
      );
      Alert.alert('Sucesso', 'Avaliacao de marcha salva no historico do paciente!', [
        { text: 'OK', onPress: () => navigation.navigate('EvaluationHome') },
      ]);
    } catch (error) {
      console.error('Erro ao salvar avaliacao de marcha:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a avaliacao.');
    }
  };

  const ang = anguloCalculado();

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          useNativeControls={false}
          isLooping
          onPlaybackStatusUpdate={onStatusUpdate}
        />
        <TouchableOpacity activeOpacity={1} style={styles.overlay} onPress={marcarPonto}>
          {!isPlaying && pontos.length === 0 && <Text style={styles.playIcon}>Toque para marcar</Text>}
          {pontos.length >= 2 && <Linha a={pontos[1]} b={pontos[0]} />}
          {pontos.length >= 3 && <Linha a={pontos[1]} b={pontos[2]} />}
          {pontos.map((p, i) => (
            <View key={i} style={[styles.marcador, { left: p.x - 8, top: p.y - 8 }]} />
          ))}
        </TouchableOpacity>
      </View>

      <View style={styles.rowBetween}>
        <TouchableOpacity style={styles.btnPlay} onPress={alternarPlayPause}>
          <Text style={styles.btnPlayText}>{isPlaying ? 'Pausar' : 'Reproduzir'}</Text>
        </TouchableOpacity>
        {ang !== null && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{ang} graus</Text>
          </View>
        )}
      </View>

      <Text style={styles.label}>Velocidade da Marcha</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btnMin, rate === 1.0 && styles.activeBtn]} onPress={() => alterarVelocidade(1.0)}>
          <Text style={[styles.btnText, rate === 1.0 && styles.activeBtnText]}>1x</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, rate === 0.5 && styles.activeBtn]} onPress={() => alterarVelocidade(0.5)}>
          <Text style={[styles.btnText, rate === 0.5 && styles.activeBtnText]}>2x Lento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, rate === 0.3 && styles.activeBtn]} onPress={() => alterarVelocidade(0.3)}>
          <Text style={[styles.btnText, rate === 0.3 && styles.activeBtnText]}>3x Lento</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Marcacao ({pontos.length}/3 pontos)</Text>
      <TouchableOpacity style={styles.btnLimpar} onPress={limparPontos}>
        <Text style={styles.btnText}>Limpar Marcacao</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.captureButton} onPress={salvar}>
        <Text style={styles.captureText}>Salvar no Historico do Paciente</Text>
      </TouchableOpacity>
    </View>
  );
}

function Linha({ a, b }: { a: Ponto; b: Ponto }) {
  const comprimento = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const rot = Math.atan2(b.y - a.y, b.x - a.x) * (180 / Math.PI);
  return <View style={[styles.linha, { left: a.x, top: a.y, width: comprimento, transform: [{ rotate: rot + 'deg' }] }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  videoContainer: { width: '100%', height: VIDEO_HEIGHT, backgroundColor: '#000', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  playIcon: { fontSize: 16, color: 'rgba(255,255,255,0.85)', fontWeight: 'bold' },
  marcador: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' },
  linha: { position: 'absolute', height: 2, backgroundColor: '#4ADE80', transformOrigin: 'left' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  btnPlay: { backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  btnPlayText: { color: '#0F172A', fontWeight: 'bold', fontSize: 13 },
  badge: { backgroundColor: '#DCFCE7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  badgeText: { color: '#16A34A', fontWeight: 'bold', fontSize: 14 },
  label: { fontSize: 14, color: '#64748B', fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  btnMin: { flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  activeBtn: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  btnText: { color: '#0F172A', fontSize: 12, fontWeight: 'bold' },
  activeBtnText: { color: '#FFFFFF' },
  btnLimpar: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  captureButton: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 16 },
  captureText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
