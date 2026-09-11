import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Vista } from '../../constants/posturalPoints';
import CardReferencia, { CardId } from '../../components/CardReferencia';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';

// Imagem de referencia exibida na propria tela, conforme a vista escolhida.
const IMAGENS_VISTA: Record<string, any> = {
  anterior: require('../../../assets/referencias/card-anterior.jpg'),
  posterior: require('../../../assets/referencias/card-posterior.jpg'),
  lateral_direita: require('../../../assets/referencias/card-lateral.jpg'),
  lateral_esquerda: require('../../../assets/referencias/card-lateral.jpg'),
};

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
        <>
          <Text style={styles.sectionTitle}>Como realizar a avaliacao</Text>
          <View style={styles.cardProtocolo}>
            <Image
              source={IMAGENS_VISTA[vistaSelecionada]}
              style={styles.imagemReferencia}
              resizeMode="contain"
            />
            <Text style={styles.protocoloTexto}>
              1. Paciente descalco, pes alinhados, bracos ao lado do corpo.{'\n'}
              2. Fotografe a corpo inteiro, camera na altura do quadril.{'\n'}
              3. Marque os pontos anatomicos indicados na imagem.{'\n'}
              4. O app calcula os desvios e classifica cada medida.
            </Text>
          </View>

          <CardReferencia card={(vistaSelecionada === 'anterior' ? 'anterior' : vistaSelecionada === 'posterior' ? 'posterior' : 'lateral') as CardId} />
        </>
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
  cardProtocolo: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8 },
  imagemReferencia: { width: '100%', height: 240, borderRadius: 10, backgroundColor: '#F8FAFC' },
  protocoloTexto: { fontSize: 12, color: '#475569', lineHeight: 19, marginTop: 10 },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
