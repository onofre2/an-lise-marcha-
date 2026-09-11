import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
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

      <Text style={styles.sectionTitle}>Como realizar a avaliacao</Text>
      <View style={styles.cardProtocolo}>
        <Image
          source={require('../../../assets/referencias/card-cervical.jpg')}
          style={styles.imagemReferencia}
          resizeMode="contain"
        />
        <Text style={styles.protocoloTexto}>
          1. Paciente sentado ou em pe, olhar no horizonte.{'\n'}
          2. Fotografe de perfil, camera na altura do ombro.{'\n'}
          3. Marque C7, o trago da orelha e o acromio.{'\n'}
          4. O app calcula o angulo craniovertebral.
        </Text>
      </View>

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
  cardProtocolo: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8 },
  imagemReferencia: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#F8FAFC' },
  protocoloTexto: { fontSize: 12, color: '#475569', lineHeight: 19, marginTop: 10 },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
