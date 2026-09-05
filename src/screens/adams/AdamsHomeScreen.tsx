import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';

export default function AdamsHomeScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();

  const iniciar = () => {
    if (!pacienteAtivo) {
      Alert.alert('Atencao', 'Selecione o paciente na aba Historico antes de continuar.');
      return;
    }
    navigation.navigate('AdamsCapture', { pacienteId: pacienteAtivo.id });
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
          <Text style={styles.avisoTexto}>Nenhum paciente ativo. Va ate a aba Historico e toque em "Ativar" no paciente desejado.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Como realizar o teste</Text>
      <View style={styles.cardProtocolo}>
        <Image
          source={require('../../../assets/referencias/teste-adams.jpg')}
          style={styles.imagemReferencia}
          resizeMode="contain"
        />
        <Text style={styles.protocoloTexto}>
          1. Paciente de costas para voce, pes juntos e descalcos.{'\n'}
          2. Peca para inclinar o tronco a frente, mãos em direcao aos joelhos.{'\n'}
          3. Fotografe por tras, na altura do dorso.{'\n'}
          4. Marque o ponto mais alto de cada lado das costas.
        </Text>
      </View>

      <View style={styles.cardAviso}>
        <Text style={styles.cardAvisoTexto}>
          Este teste e uma triagem visual de assimetria. Nao substitui a medicao com escoliometro nem exame de imagem.
        </Text>
      </View>

      <TouchableOpacity style={styles.btnIniciar} onPress={iniciar}>
        <Text style={styles.btnIniciarText}>Abrir Camera</Text>
      </TouchableOpacity>
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
  cardProtocolo: { backgroundColor: '#FFFFFF', padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  imagemReferencia: { width: '100%', height: 170, borderRadius: 10, marginBottom: 12 },
  protocoloTexto: { fontSize: 13, color: '#334155', lineHeight: 22 },
  cardAviso: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12, marginTop: 14 },
  cardAvisoTexto: { color: '#92400E', fontSize: 12, lineHeight: 17 },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center' },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
