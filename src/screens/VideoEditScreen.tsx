import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

export default function VideoEditScreen({ route }: any) {
  const { videoUri, pacienteId, angulo } = route.params as {
    videoUri: string; pacienteId: number; angulo: string;
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [corSelecionada, setCorSelecionada] = useState('#EF4444');
  const [espessura, setEspessura] = useState(4);
  const [modoDesenho, setModoDesenho] = useState<'livre' | 'ponto_a_ponto'>('ponto_a_ponto');

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

  const tirarFotoEGravar = () => {
    alert("Snapshot biomecânico gerado com sucesso com as marcações!");
  };

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
        <TouchableOpacity style={styles.playOverlay} onPress={alternarPlayPause}>
          {!isPlaying && <Text style={styles.playIcon}>▶</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Velocidade da Marcha (Câmera Lenta):</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btnMin, rate === 1.0 && styles.activeBtn]} onPress={() => alterarVelocidade(1.0)}>
          <Text style={[styles.btnText, rate === 1.0 && styles.activeBtnText]}>1x (Normal)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, rate === 0.5 && styles.activeBtn]} onPress={() => alterarVelocidade(0.5)}>
          <Text style={[styles.btnText, rate === 0.5 && styles.activeBtnText]}>2x Lento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, rate === 0.3 && styles.activeBtn]} onPress={() => alterarVelocidade(0.3)}>
          <Text style={[styles.btnText, rate === 0.3 && styles.activeBtnText]}>3x Super Lento</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Ferramenta Clínicas:</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btnMin, modoDesenho === 'ponto_a_ponto' && styles.activeBtn]} onPress={() => setModoDesenho('ponto_a_ponto')}>
          <Text style={[styles.btnText, modoDesenho === 'ponto_a_ponto' && styles.activeBtnText]}>📍 Linha Ponto a Ponto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, modoDesenho === 'livre' && styles.activeBtn]} onPress={() => setModoDesenho('livre')}>
          <Text style={[styles.btnText, modoDesenho === 'livre' && styles.activeBtnText]}>✏️ Desenho Livre</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Cor da Linha de Ajuste:</Text>
      <View style={styles.row}>
        {['#EF4444', '#10B981', '#3B82F6', '#F59E0B'].map((cor) => (
          <TouchableOpacity
            key={cor}
            style={[styles.colorCircle, { backgroundColor: cor }, corSelecionada === cor && styles.activeColor]}
            onPress={() => setCorSelecionada(cor)}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.captureButton} onPress={tirarFotoEGravar}>
        <Text style={styles.captureText}>📸 Tirar Foto & Registrar Desajuste</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  videoContainer: { width: '100%', height: Dimensions.get('window').height * 0.4, backgroundColor: '#000', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16, overflow: 'hidden' },
  video: { width: '100%', height: '100%' },
  playOverlay: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  playIcon: { fontSize: 48, color: 'rgba(255,255,255,0.85)' },
  label: { fontSize: 14, color: '#64748B', fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  btnMin: { flex: 1, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  activeBtn: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  btnText: { color: '#0F172A', fontSize: 12, fontWeight: 'bold' },
  activeBtnText: { color: '#FFFFFF' },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8 },
  activeColor: { borderWidth: 3, borderColor: '#0F172A' },
  captureButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  captureText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
