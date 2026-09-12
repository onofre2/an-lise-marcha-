import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import CardReferencia from '../../components/CardReferencia';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';

export type VistaCervical =
  | 'anterior'
  | 'posterior'
  | 'lateral_direita'
  | 'lateral_esquerda'
  | 'superior';

const VISTAS: { id: VistaCervical; label: string }[] = [
  { id: 'anterior', label: 'Anterior' },
  { id: 'posterior', label: 'Posterior' },
  { id: 'lateral_direita', label: 'Lateral Direita' },
  { id: 'lateral_esquerda', label: 'Lateral Esquerda' },
  { id: 'superior', label: 'Superior' },
];

// Protocolo de captura de cada vista, exibido na propria tela.
const PROTOCOLOS: Record<VistaCervical, string> = {
  anterior:
    "1. Paciente em pe, de frente para a camera.\n" +
    "2. Olhar no horizonte, bracos ao lado do corpo.\n" +
    "3. Camera na altura dos ombros.\n" +
    "4. Foto de registro: esta vista nao tem medicao angular.",
  posterior:
    "1. Paciente em pe, de costas para a camera.\n" +
    "2. Olhar no horizonte, ombros relaxados.\n" +
    "3. Camera na altura dos ombros.\n" +
    "4. Marque C7, acromioclavicular e lobo da orelha.",
  lateral_direita:
    "1. Paciente em pe, perfil direito para a camera.\n" +
    "2. Olhar no horizonte, braco ao lado do corpo.\n" +
    "3. Camera na altura do ombro.\n" +
    "4. Marque o tragus e C7.",
  lateral_esquerda:
    "1. Paciente em pe, perfil esquerdo para a camera.\n" +
    "2. Olhar no horizonte, braco ao lado do corpo.\n" +
    "3. Camera na altura do ombro.\n" +
    "4. Marque o tragus e C7.",
  superior:
    "1. Paciente sentado, olhar a frente.\n" +
    "2. Camera acima da cabeca, apontada para baixo.\n" +
    "3. O manubrio do esterno precisa aparecer no enquadramento.\n" +
    "4. Marque manubrio, topo da cabeca e apice do nariz.",
};

export default function CervicalHomeScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();
  const [vistaSelecionada, setVistaSelecionada] = useState<VistaCervical | null>(null);

  const iniciar = () => {
    if (!pacienteAtivo || !vistaSelecionada) {
      Alert.alert('Atenção', 'Selecione o paciente na aba Histórico e a vista antes de continuar.');
      return;
    }
    navigation.navigate('CervicalCapture', { pacienteId: pacienteAtivo.id, vista: vistaSelecionada });
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
        {VISTAS.map(v => (
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
              source={require('../../../assets/referencias/card-cervical-vistas.jpg')}
              style={styles.imagemReferencia}
              resizeMode="contain"
            />
            <Text style={styles.protocoloTexto}>{PROTOCOLOS[vistaSelecionada]}</Text>
          </View>

          <CardReferencia card="cervical" />

          <TouchableOpacity style={styles.btnIniciar} onPress={iniciar}>
            <Text style={styles.btnIniciarText}>Abrir Câmera</Text>
          </TouchableOpacity>
        </>
      )}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  botaoGrid: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  botaoGridAtivo: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  itemText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  itemTextAtivo: { color: '#FFFFFF' },
  cardProtocolo: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8 },
  imagemReferencia: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#F8FAFC' },
  protocoloTexto: { fontSize: 12, color: '#475569', lineHeight: 19, marginTop: 10 },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 24, alignItems: 'center', shadowColor: '#22C55E', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
