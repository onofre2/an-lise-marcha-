import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

interface Linha {
  id: string;
  tipo: 'livre' | 'ponto_a_ponto';
  pontos: { x: number; y: number }[];
  cor: string;
  espessura: number;
  timestamp: number;
}

export default function VideoEditScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rate, setRate] = useState(1.0); // 1x, 2x, 3x mais lento
  const [corSelecionada, setCorSelecionada] = useState('#EF4444'); // Padrão Vermelho
  const [espessura, setEspessura] = useState(4);
  const [modoDesenho, setModoDesenho] = useState<'livre' | 'ponto_a_ponto'>('ponto_a_ponto');
  
  const videoRef = useRef<Video>(null);

  const alterarVelocidade = (velocidade: number) => {
    setRate(velocidade);
    if (videoRef.current) {
      videoRef.current.setRateAsync(velocidade, true);
    }
  };

  const tirarFotoEGravar = () => {
    // Lógica para capturar o frame atual com os desenhos overlay e salvar no banco
    alert("Snapshot biomecânico gerado com sucesso com as marcações!");
  };

  return (
    <View style={styles.container}>
      {/* Área do Player de Vídeo e Canvas de Desenho */}
      <View style={styles.videoContainer}>
        <Text style={styles.videoPlaceholder}>🔬 [Área do Vídeo de 15s com Canvas Activo]</Text>
        {/* O componente Expo AV Video entrará aqui linkado ao arquivo temporário */}
      </View>

      {/* Controles de Velocidade (Slow Motion) */}
      <Text style={styles.label}>Velocidade da Marcha (Câmera Lenta):</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btnMin, rate === 1.0 && styles.activeBtn]} onPress={() => alterarVelocidade(1.0)}>
          <Text style={styles.btnText}>1x (Normal)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, rate === 0.5 && styles.activeBtn]} onPress={() => alterarVelocidade(0.5)}>
          <Text style={styles.btnText}>2x Lento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, rate === 0.3 && styles.activeBtn]} onPress={() => alterarVelocidade(0.3)}>
          <Text style={styles.btnText}>3x Super Lento</Text>
        </TouchableOpacity>
      </View>

      {/* Ferramentas de Marcação */}
      <Text style={styles.label}>Ferramenta Clínicas:</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.btnMin, modoDesenho === 'ponto_a_ponto' && styles.activeBtn]} onPress={() => setModoDesenho('ponto_a_ponto')}>
          <Text style={styles.btnText}>📍 Linha Ponto a Ponto</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnMin, modoDesenho === 'livre' && styles.activeBtn]} onPress={() => setModoDesenho('livre')}>
          <Text style={styles.btnText}>✏️ Desenho Livre</Text>
        </TouchableOpacity>
      </View>

      {/* Seletores de Cores */}
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

      {/* Ação Principal: Capturar Frame Editado */}
      <TouchableOpacity style={styles.captureButton} onPress={tirarFotoEGravar}>
        <Text style={styles.captureText}>📸 Tirar Foto & Registrar Desajuste</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  videoContainer: { width: '100%', height: Dimensions.get('window').height * 0.4, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  videoPlaceholder: { color: '#94A3B8', fontSize: 14, fontWeight: 'bold' },
  label: { fontSize: 14, color: '#94A3B8', fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  btnMin: { flex: 1, backgroundColor: '#1E293B', padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4, borderWidth: 1, borderColor: '#334155' },
  activeBtn: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  btnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  colorCircle: { width: 36, height: 36, borderRadius: 18, marginHorizontal: 8 },
  activeColor: { borderWidth: 3, borderColor: '#FFFFFF' },
  captureButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  captureText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
