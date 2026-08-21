import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import db from '../../services/database';
import { Vista } from '../../constants/posturalPoints';

interface Paciente { id: number; nome: string; }

export default function PosturalHomeScreen({ navigation }: any) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<number | null>(null);
  const [vistaSelecionada, setVistaSelecionada] = useState<Vista | null>(null);

  useEffect(() => {
    try {
      const resultado = db.getAllSync('SELECT id, nome FROM pacientes ORDER BY nome ASC') as Paciente[];
      setPacientes(resultado);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    }
  }, []);

  const vistas: { id: Vista; label: string }[] = [
    { id: 'anterior', label: 'Anterior' },
    { id: 'posterior', label: 'Posterior' },
    { id: 'lateral_direita', label: 'Lateral Direita' },
    { id: 'lateral_esquerda', label: 'Lateral Esquerda' },
  ];

  const iniciar = () => {
    if (!pacienteSelecionado || !vistaSelecionada) {
      Alert.alert('Atenção', 'Selecione o paciente e a vista antes de continuar.');
      return;
    }
    navigation.navigate('PosturalCapture', { pacienteId: pacienteSelecionado, vista: vistaSelecionada, modo: 'completa' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>1. Selecione o Paciente</Text>
      <View style={styles.card}>
        {pacientes.length === 0 ? (
          <Text style={styles.alertText}>Nenhum paciente cadastrado.</Text>
        ) : (
          pacientes.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.item, pacienteSelecionado === p.id && styles.itemAtivo]}
              onPress={() => setPacienteSelecionado(p.id)}
            >
              <Text style={[styles.itemText, pacienteSelecionado === p.id && styles.itemTextAtivo]}>{p.nome}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>2. Selecione a Vista</Text>
      <View style={styles.grid}>
        {vistas.map((v) => (
          <TouchableOpacity
            key={v.id}
            style={[styles.botaoGrid, vistaSelecionada === v.id && styles.botaoGridAtivo]}
            onPress={() => setVistaSelecionada(v.id)}
          >
            <Text style={[styles.itemText, vistaSelecionada === v.id && styles.itemTextAtivo]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {pacienteSelecionado && vistaSelecionada && (
        <TouchableOpacity style={styles.btnIniciar} onPress={iniciar}>
          <Text style={styles.btnIniciarText}>Abrir Câmera</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 20, marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  alertText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  item: { padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: '#F8FAFC' },
  itemAtivo: { backgroundColor: '#22C55E' },
  itemText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  itemTextAtivo: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  botaoGrid: { width: '48%', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  botaoGridAtivo: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
