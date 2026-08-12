import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import db from '../services/database';

interface Paciente {
  id: number;
  nome: string;
}

export default function EvaluationScreen({ navigation }: any) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<number | null>(null);
  const [anguloSelecionado, setAnguloSelecionado] = useState<string | null>(null);

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
    navigation.navigate('CameraCapture', {
      pacienteId: pacienteSelecionado,
      angulo: anguloSelecionado,
    });
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
  pickerContainer: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  pacienteItem: { padding: 12, borderRadius: 8, marginBottom: 6, backgroundColor: '#F8FAFC' },
  alertText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
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
