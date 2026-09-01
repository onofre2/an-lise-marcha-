import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Vista } from '../../constants/posturalPoints';
import CardReferencia, { CardId } from '../../components/CardReferencia';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';

export default function PosturalHomeScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();
  const [vistaSelecionada, setVistaSelecionada] = useState<Vista | null>(null);

  const vistas: { id: Vista; label: string }[] = [
    { id: 'anterior', label: 'Anterior' },
    { id: 'posterior', label: 'Posterior' },
    { id: 'lateral_direita', label: 'Lateral Direita' },
    { id: 'lateral_esquerda', label: 'Lateral Esquerda' },
  ];

  const iniciar = () => {
    if (!pacienteAtivo || !vistaSelecionada) {
      Alert.alert('Atenção', 'Selecione o paciente na aba Histórico e a vista antes de continuar.');
      return;
    }
    navigation.navigate('PosturalCapture', { pacienteId: pacienteAtivo.id, vista: vistaSelecionada, modo: 'completa' });
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

      <Text style={styles.sectionTitle}>Selecione a Vista</Text>
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

      {vistaSelecionada && (
        <CardReferencia card={(vistaSelecionada === 'anterior' ? 'anterior' : vistaSelecionada === 'posterior' ? 'posterior' : 'lateral') as CardId} />
      )}

      {vistaSelecionada && (
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
  cardPacienteAtivo: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#22C55E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pacienteAtivoNome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  trocarLink: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  avisoSemPaciente: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12 },
  avisoTexto: { color: '#92400E', fontSize: 13, lineHeight: 18 },
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
