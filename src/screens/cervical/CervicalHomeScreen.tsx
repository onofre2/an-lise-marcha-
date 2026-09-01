import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import CardReferencia from '../../components/CardReferencia';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';

export default function CervicalHomeScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();

  const iniciar = () => {
    if (!pacienteAtivo) {
      Alert.alert('Atenção', 'Selecione o paciente na aba Histórico antes de continuar.');
      return;
    }
    navigation.navigate('CervicalCapture', { pacienteId: pacienteAtivo.id });
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

      <CardReferencia card="cervical" />

      <TouchableOpacity style={styles.btnIniciar} onPress={iniciar}>
        <Text style={styles.btnIniciarText}>Abrir Câmera</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 12 },
  cardPacienteAtivo: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#22C55E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pacienteAtivoNome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  trocarLink: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  avisoSemPaciente: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12 },
  avisoTexto: { color: '#92400E', fontSize: 13, lineHeight: 18 },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
