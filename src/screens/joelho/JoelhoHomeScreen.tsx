import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import CardReferencia from '../../components/CardReferencia';
import { usePacienteAtivo } from '../../context/PacienteAtivoContext';
import { PONTOS_JOELHO, VistaJoelho } from '../../constants/joelhoPoints';

const VISTAS: { id: VistaJoelho; label: string }[] = [
  { id: 'anterior', label: 'Anterior' },
  { id: 'lateral_direita', label: 'Lateral Direita' },
  { id: 'lateral_esquerda', label: 'Lateral Esquerda' },
];

const PROTOCOLOS: Record<string, string> = {
  anterior:
    "1. Paciente em pe, descalco, de frente para a camera.\n" +
    "2. Pes alinhados na largura do quadril, carga bipodal igual.\n" +
    "3. Camera a 2 metros, na altura do joelho, perpendicular ao paciente.\n" +
    "4. Marque espinhas iliacas, patelas e maleolos dos dois lados.",
  lateral_direita:
    "1. Paciente em pe, descalco, perfil direito para a camera.\n" +
    "2. Carga bipodal igual, joelhos sem forcar extensao.\n" +
    "3. Camera a 2 metros, na altura do joelho.\n" +
    "4. Marque trocanter maior, epicondilo lateral e maleolo lateral.",
  lateral_esquerda:
    "1. Paciente em pe, descalco, perfil esquerdo para a camera.\n" +
    "2. Carga bipodal igual, joelhos sem forcar extensao.\n" +
    "3. Camera a 2 metros, na altura do joelho.\n" +
    "4. Marque trocanter maior, epicondilo lateral e maleolo lateral.",
  retrope:
    "1. Paciente em pe, descalco, de costas para a camera.\n" +
    "2. Pes alinhados na largura do quadril, carga bipodal igual.\n" +
    "3. Camera a 1 metro, na altura do tornozelo, perpendicular ao chao.\n" +
    "4. Marque os quatro pontos do retrope em cada pe.",
};

export default function JoelhoHomeScreen({ navigation }: any) {
  const { pacienteAtivo } = usePacienteAtivo();
  const [vistaSelecionada, setVistaSelecionada] = useState<string | null>(null);

  const iniciar = (vista: string) => {
    if (!pacienteAtivo) {
      Alert.alert('Atencao', 'Selecione o paciente na aba Historico antes de continuar.');
      return;
    }
    navigation.navigate('JoelhoCapture', { pacienteId: pacienteAtivo.id, vista });
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
            <Text style={styles.protocoloTexto}>{PROTOCOLOS[vistaSelecionada]}</Text>
          </View>

          <TouchableOpacity style={styles.btnIniciar} onPress={() => iniciar(vistaSelecionada)}>
            <Text style={styles.btnIniciarText}>Abrir Camera</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.sectionTitle}>Analise da Pisada</Text>
      <View style={styles.cardProtocolo}>
        <Text style={styles.protocoloTexto}>{PROTOCOLOS.retrope}</Text>
      </View>

      <TouchableOpacity style={styles.btnPisada} onPress={() => iniciar('retrope')}>
        <Text style={styles.btnIniciarText}>Analise da Pisada</Text>
      </TouchableOpacity>

      <View style={styles.cardProtocolo}>
        <Image
          source={require('../../../assets/referencias/pisada-plantar.jpg')}
          style={styles.imagemPisada}
          resizeMode="contain"
        />
        <Image
          source={require('../../../assets/referencias/pisada-posterior.jpg')}
          style={styles.imagemPisada}
          resizeMode="contain"
        />
      </View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  botaoGrid: { width: '48%', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
  botaoGridAtivo: { backgroundColor: '#0284C7', borderColor: '#0284C7' },
  itemText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  itemTextAtivo: { color: '#FFFFFF' },
  cardProtocolo: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  protocoloTexto: { fontSize: 12, color: '#475569', lineHeight: 19 },
  btnIniciar: { backgroundColor: '#22C55E', padding: 18, borderRadius: 16, marginTop: 16, alignItems: 'center' },
  btnPisada: { backgroundColor: '#0284C7', padding: 18, borderRadius: 16, marginTop: 16, alignItems: 'center' },
  imagemPisada: { width: '100%', height: 130, marginBottom: 8 },
  btnIniciarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});
