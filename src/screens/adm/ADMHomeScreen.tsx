import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { MOVIMENTOS } from '../../constants/movimentos';
import CardReferencia from '../../components/CardReferencia';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';

export default function ADMHomeScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();
  const [movimentoSelecionado, setMovimentoSelecionado] = useState<string | null>(null);

  const iniciar = () => {
    if (!pacienteAtivo || !movimentoSelecionado) {
      Alert.alert('Atencao', 'Selecione o paciente na aba Historico e o movimento antes de continuar.');
      return;
    }
    navigation.navigate('ADMCapture', { pacienteId: pacienteAtivo.id, movimentoId: movimentoSelecionado });
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

      <Text style={styles.sectionTitle}>Selecione o Movimento</Text>
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

      <Text style={styles.sectionTitle}>Como realizar a medicao</Text>
      <View style={styles.cardProtocolo}>
        <Image
          source={require('../../../assets/referencias/card-adm.jpg')}
          style={styles.imagemReferencia}
          resizeMode="contain"
        />
        <Text style={styles.protocoloTexto}>
          1. Posicione o paciente conforme o movimento escolhido.{'\n'}
          2. Fotografe de perfil a articulacao avaliada.{'\n'}
          3. Marque os tres pontos: extremidade, eixo articular e extremidade.{'\n'}
          4. O app calcula a amplitude e compara com a referencia.
        </Text>
      </View>

      <CardReferencia card="adm" />

      {movimentoSelecionado && (
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
  cardPacienteAtivo: { backgroundColor: '#F0FDF4', padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#22C55E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pacienteAtivoNome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  trocarLink: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  avisoSemPaciente: { backgroundColor: '#FEF3C7', padding: 14, borderRadius: 12 },
  avisoTexto: { color: '#92400E', fontSize: 13, lineHeight: 18 },
  card: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  item: { padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: '#F8FAFC' },
  itemAtivo: { backgroundColor: '#22C55E' },
  itemText: { color: '#475569', fontWeight: '600', fontSize: 14 },
  itemTextAtivo: { color: '#FFFFFF' },
  cardProtocolo: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8 },
  imagemReferencia: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#F8FAFC' },
  protocoloTexto: { fontSize: 12, color: '#475569', lineHeight: 19, marginTop: 10 },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center' },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
