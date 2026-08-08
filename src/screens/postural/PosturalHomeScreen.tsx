import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import db from '../../services/database';
import { Vista } from '../../constants/posturalPoints';

interface Paciente { id: number; nome: string; }

export default function PosturalHomeScreen({ navigation }: any) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<number | null>(null);
  const [vistaSelecionada, setVistaSelecionada] = useState<Vista | null>(null);
  const [modo, setModo] = useState<'rapida' | 'completa'>('rapida');

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
    navigation.navigate('PosturalCapture', { pacienteId: pacienteSelecionado, vista: vistaSelecionada, modo });
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
            style={[styles.botaoGrid, vistaSelecionada === v.id && styles.itemAtivo]}
            onPress={() => setVistaSelecionada(v.id)}
          >
            <Text style={[styles.itemText, vistaSelecionada === v.id && styles.itemTextAtivo]}>{v.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>3. Modo de Análise</Text>
      <View style={styles.grid}>
        <TouchableOpacity style={[styles.botaoGrid, modo === 'rapida' && styles.itemAtivo]} onPress={() => setModo('rapida')}>
          <Text style={[styles.itemText, modo === 'rapida' && styles.itemTextAtivo]}>Análise Rápida</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.botaoGrid, modo === 'completa' && styles.itemAtivo]} onPress={() => setModo('completa')}>
          <Text style={[styles.itemText, modo === 'completa' && styles.itemTextAtivo]}>Postura Completa</Text>
        </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#94A3B8', marginTop: 20, marginBottom: 12 },
  card: { backgroundColor: '#1E293B', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  alertText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  item: { padding: 12, borderRadius: 8, marginBottom: 6, backgroundColor: '#0F172A' },
  itemAtivo: { backgroundColor: '#0284C7' },
  itemText: { color: '#94A3B8', fontWeight: 'bold', fontSize: 14 },
  itemTextAtivo: { color: '#FFFFFF' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  botaoGrid: { width: '48%', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  btnIniciar: { backgroundColor: '#10B981', padding: 18, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
