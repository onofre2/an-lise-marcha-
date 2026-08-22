import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import db from '../../services/database';
import { MOVIMENTOS } from '../../constants/movimentos';
import CardReferencia from '../../components/CardReferencia';

interface Paciente { id: number; nome: string; }

export default function ADMHomeScreen({ navigation }: any) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<number | null>(null);
  const [movimentoSelecionado, setMovimentoSelecionado] = useState<string | null>(null);

  useEffect(() => {
    try {
      const resultado = db.getAllSync('SELECT id, nome FROM pacientes ORDER BY nome ASC') as Paciente[];
      setPacientes(resultado);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    }
  }, []);

  const iniciar = () => {
    if (!pacienteSelecionado || !movimentoSelecionado) {
      Alert.alert('Atencao', 'Selecione o paciente e o movimento antes de continuar.');
      return;
    }
    navigation.navigate('ADMCapture', { pacienteId: pacienteSelecionado, movimentoId: movimentoSelecionado });
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

      <Text style={styles.sectionTitle}>2. Selecione o Movimento</Text>
      <View style={styles.card}>
        {MOVIMENTOS.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[styles.item, movimentoSelecionado === m.id && styles.itemAtivo]}
            onPress={() => setMovimentoSelecionado(m.id)}
          >
            <Text style={[styles.itemText, movimentoSelecionado === m.id && styles.itemTextAtivo]}>{m.nome}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <CardReferencia card="adm" />

      {pacienteSelecionado && movimentoSelecionado && (
        <TouchableOpacity style={styles.btnIniciar} onPress={iniciar}>
          <Text style={styles.btnIniciarText}>Abrir Camera</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 20, marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  alertText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  item: { padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: '#F8FAFC' },
  itemAtivo: { backgroundColor: '#22C55E' },
  itemText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  itemTextAtivo: { color: '#FFFFFF' },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center' },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
