import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import db from '../../services/database';
import CardReferencia from '../../components/CardReferencia';

interface Paciente { id: number; nome: string; }

export default function CervicalHomeScreen({ navigation }: any) {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [pacienteSelecionado, setPacienteSelecionado] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
    try {
      const resultado = db.getAllSync('SELECT id, nome FROM pacientes ORDER BY nome ASC') as Paciente[];
      setPacientes(resultado);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    }
    }, [])
  );

  const iniciar = () => {
    if (!pacienteSelecionado) {
      Alert.alert('Atenção', 'Selecione o paciente antes de continuar.');
      return;
    }
    navigation.navigate('CervicalCapture', { pacienteId: pacienteSelecionado });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Selecione o Paciente</Text>
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

      <CardReferencia card="cervical" />

      {pacienteSelecionado && (
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
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  alertText: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  item: { padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: '#F8FAFC' },
  itemAtivo: { backgroundColor: '#22C55E' },
  itemText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  itemTextAtivo: { color: '#FFFFFF' },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
