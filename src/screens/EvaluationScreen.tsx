import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import db from '../services/database';
import { FASES_MARCHA } from '../constants/fasesMarcha';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert , Image, Modal, Dimensions} from 'react-native';
import CardReferencia from '../components/CardReferencia';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';

export default function EvaluationScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();
  const [anguloSelecionado, setAnguloSelecionado] = useState<string | null>(null);
  const [protocoloAberto, setProtocoloAberto] = useState(false);

  // A analise da marcha usa apenas o plano sagital: os angulos de referencia
  // do ciclo (Perry) sao medidos de perfil. Vistas frontais avaliam outro
  // conjunto de achados, ja coberto pela avaliacao postural.
  // Avaliacoes de marcha ja salvas para o paciente ativo, com os quatro
  // eventos de cada uma. Recarrega ao voltar para a aba.
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  useFocusEffect(
    React.useCallback(() => {
      if (!pacienteAtivo) { setAvaliacoes([]); return; }
      try {
        const linhas = db.getAllSync(
          'SELECT * FROM avaliacoes WHERE id_paciente = ? ORDER BY id DESC',
          [pacienteAtivo.id]
        ) as any[];
        setAvaliacoes(linhas);
      } catch {
        setAvaliacoes([]);
      }
    }, [pacienteAtivo])
  );

  const angulos = [
    { id: 'lateral_direito', label: 'Lateral Direito' },
    { id: 'lateral_esquerdo', label: 'Lateral Esquerdo' },
  ];

  const iniciarGravacao = () => {
    if (!pacienteAtivo) {
      Alert.alert("Atenção", "Selecione o paciente na aba Histórico antes de continuar.");
      return;
    }
    navigation.navigate('CameraCapture', {
      pacienteId: pacienteAtivo.id,
      angulo: anguloSelecionado,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Paciente</Text>
      {pacienteAtivo ? (
        <View style={styles.cardPacienteAtivo}>
          <Text style={styles.pacienteAtivoNome}>{pacienteAtivo.nome}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Pacientes')}>
            <Text style={styles.trocarLink}>Trocar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.avisoSemPaciente}>
          <Text style={styles.avisoTexto}>Nenhum paciente ativo. Vá até a aba Histórico e toque em "Ativar" no paciente desejado.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Protocolo de Posicionamento</Text>
      <View style={styles.protocolCard}>
        <TouchableOpacity activeOpacity={0.8} onPress={() => setProtocoloAberto(true)}>
          <Image
            source={require('../../assets/referencias/protocolo-marcha.jpg')}
            style={styles.imagemProtocolo}
            resizeMode="contain"
          />
          <Text style={styles.dicaAmpliar}>Toque para ampliar</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={protocoloAberto} transparent animationType="fade">
        <TouchableOpacity
          style={styles.fundoAmpliado}
          activeOpacity={1}
          onPress={() => setProtocoloAberto(false)}
        >
          <Image
            source={require('../../assets/referencias/protocolo-marcha.jpg')}
            style={styles.imagemAmpliada}
            resizeMode="contain"
          />
          <Text style={styles.dicaFechar}>Toque para fechar</Text>
        </TouchableOpacity>
      </Modal>

      <Text style={styles.sectionTitle}>Selecione o Ângulo da Marcha</Text>
      <View style={styles.grid}>
        {angulos.map((ang) => (
          <TouchableOpacity
            key={ang.id}
            style={[styles.button, anguloSelecionado === ang.id && styles.buttonActive]}
            onPress={() => setAnguloSelecionado(ang.id)}
          >
            <Text style={[styles.buttonText, anguloSelecionado === ang.id && styles.buttonTextActive]}>
              {ang.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <CardReferencia card="marcha" />

      {anguloSelecionado && (
        <TouchableOpacity style={styles.actionButton} onPress={iniciarGravacao}>
          <Text style={styles.actionButtonText}>Abrir Câmera (Máx 25s)</Text>
        </TouchableOpacity>
      )}

      {avaliacoes.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Avaliações Salvas</Text>
          {avaliacoes.map(av => {
            let frames: Record<string, string> = {};
            try { frames = av.frames_json ? JSON.parse(av.frames_json) : {}; } catch {}
            return (
              <View key={av.id} style={styles.cardAvaliacao}>
                <Text style={styles.cardAvaliacaoData}>
                  {av.data_avaliacao} · {String(av.angulo || '').replace('_', ' ')}
                </Text>
                <View style={styles.gradeEventos}>
                  {FASES_MARCHA.map(f => (
                    <TouchableOpacity
                      key={f.id}
                      style={styles.cardEvento}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('AvaliacaoDetail', { id: av.id, tipo: 'marcha' })}
                    >
                      {frames[f.id] ? (
                        <Image source={{ uri: frames[f.id] }} style={styles.miniFrame} resizeMode="cover" />
                      ) : (
                        <View style={[styles.miniFrame, styles.miniFrameVazio]} />
                      )}
                      <Text style={styles.cardEventoNome} numberOfLines={2}>{f.nome}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardAvaliacao: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardAvaliacaoData: { fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  gradeEventos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cardEvento: { width: '47%', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  miniFrame: { width: '100%', height: 110, borderRadius: 8, backgroundColor: '#0F172A' },
  miniFrameVazio: { backgroundColor: '#E2E8F0' },
  cardEventoNome: { fontSize: 11, color: '#475569', fontWeight: '600', marginTop: 5, textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 20, marginBottom: 12 },
  cardPacienteAtivo: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#22C55E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pacienteAtivoNome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  trocarLink: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  avisoSemPaciente: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12 },
  avisoTexto: { color: '#92400E', fontSize: 13, lineHeight: 18 },
  imagemProtocolo: { width: '100%', height: 190, borderRadius: 8 },
  dicaAmpliar: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 6 },
  fundoAmpliado: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  imagemAmpliada: { width: Dimensions.get('window').width, height: Dimensions.get('window').height * 0.8 },
  dicaFechar: { color: '#94A3B8', fontSize: 12, marginTop: 12 },
  protocolCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  protocolText: { fontSize: 14, color: '#0F172A', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '48%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  buttonActive: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  buttonText: { color: '#64748B', fontWeight: 'bold', fontSize: 14 },
  buttonTextActive: { color: '#FFFFFF' },
  actionButton: { backgroundColor: '#EF4444', padding: 18, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});
