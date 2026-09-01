import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import CardReferencia from '../components/CardReferencia';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';

export default function EvaluationScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();
  const [anguloSelecionado, setAnguloSelecionado] = useState<string | null>(null);

  const angulos = [
    { id: 'anterior', label: 'Anterior' },
    { id: 'posterior', label: 'Posterior' },
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
        <Text style={styles.protocolText}>• Paciente deve estar **Descalço**</Text>
        <Text style={styles.protocolText}>• Caminhando em **Fundo Branco**</Text>
        <Text style={styles.protocolText}>• Distância rigorosa de **1 Metro**</Text>
        <Text style={styles.protocolText}>• Gravação **da Cintura para Baixo**</Text>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 20, marginBottom: 12 },
  cardPacienteAtivo: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#22C55E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pacienteAtivoNome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  trocarLink: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  avisoSemPaciente: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12 },
  avisoTexto: { color: '#92400E', fontSize: 13, lineHeight: 18 },
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
