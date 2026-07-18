import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import db from '../services/database';

interface Paciente {
  id: number;
  nome: string;
}

export default function EvaluationScreen() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<number | null>(null);
  const [anguloSelecionado, setAnguloSelecionado] = useState<string | null>(null);

  // Carrega os pacientes para o seletor da avaliação
  useEffect(() => {
    try {
      const resultado = db.getAllSync('SELECT id, nome FROM pacientes ORDER BY nome ASC') as Paciente[];
      setPacientes(resultado);
    } catch (error) {
      console.error("Erro ao carregar pacientes para avaliação:", error);
    }
  }, []);

  const angulos = [
    { id: 'anterior', label: 'Anterior' },
    { id: 'posterior', label: 'Posterior' },
    { id: 'lateral_direito', label: 'Lateral Direito' },
    { id: 'lateral_esquerdo', label: 'Lateral Esquerdo' },
  ];

  const iniciarGravacao = () => {
    if (!pacienteSelecionado) {
      Alert.alert("Atenção", "Por favor, selecione um paciente antes de iniciar.");
      return;
    }
    Alert.alert(
      "Câmera Pronta",
      `Iniciando captura do ângulo [${anguloSelecionado?.toUpperCase()}] limitado a 15 segundos.`
    );
    // Próximo passo: Integração com o módulo de câmera e cache de vídeo
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>1. Selecione o Paciente</Text>
      <View style={styles.pickerContainer}>
        {pacientes.length === 0 ? (
          <Text style={styles.alertText}>Nenhum paciente cadastrado. Cadastre na aba inicial primeiro!</Text>
        ) : (
          pacientes.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.pacienteItem, pacienteSelecionado === p.id && styles.buttonActive]}
              onPress={() => setPacienteSelecionado(p.id)}
            >
              <Text style={[styles.buttonText, pacienteSelecionado === p.id && styles.buttonTextActive]}>
                {p.nome}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>2. Protocolo de Posicionamento</Text>
      <View style={styles.protocolCard}>
        <Text style={styles.protocolText}>• Paciente deve estar **Descalço**</Text>
        <Text style={styles.protocolText}>• Caminhando em **Fundo Branco**</Text>
        <Text style={styles.protocolText}>• Distância rigorosa de **1 Metro**</Text>
        <Text style={styles.protocolText}>• Gravação **da Cintura para Baixo**</Text>
      </View>

      <Text style={styles.sectionTitle}>3. Selecione o Ângulo da Marcha</Text>
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

      {anguloSelecionado && pacienteSelecionado && (
        <TouchableOpacity style={styles.actionButton} onPress={iniciarGravacao}>
          <Text style={styles.actionButtonText}>Abrir Câmera (Máx 15s)</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#94A3B8', marginTop: 20, marginBottom: 12 },
  pickerContainer: { backgroundColor: '#1E293B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  pacienteItem: { padding: 12, borderRadius: 8, marginBottom: 6, backgroundColor: '#0F172A' },
  alertText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  protocolCard: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  protocolText: { fontSize: 14, color: '#F8FAFC', marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '48%', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  buttonActive: { backgroundColor: '#0284C7', borderColor: '#38BDF8' },
  buttonText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 14 },
  buttonTextActive: { color: '#FFFFFF' },
  actionButton: { backgroundColor: '#EF4444', padding: 18, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 }
});
