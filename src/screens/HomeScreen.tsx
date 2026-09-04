import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, ScrollView, Image, Linking } from 'react-native';
import db from '../services/database';
import { useNavigation } from '@react-navigation/native';
import { usePacienteAtivo } from '../context/PacienteAtivoContext';

interface Paciente {
  id: number;
  nome: string;
  idade: number;
  data_nascimento?: string;
  sexo?: string;
  data_cadastro: string;
  observacoes?: string;
  diagnostico?: string;
  historico_medico?: string;
  anotacoes_clinicas?: string;
  conclusao_clinica?: string;
  objetivos_terapeuticos?: string;
  foto_uri?: string;
  total_avaliacoes: number;
}

type AbaOrdenacao = 'recentes' | 'az' | 'sessoes';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { pacienteAtivo, definirPacienteAtivo } = usePacienteAtivo();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<AbaOrdenacao>('recentes');
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [historicoMedico, setHistoricoMedico] = useState('');
  const [anotacoesClinicas, setAnotacoesClinicas] = useState('');
  const [conclusaoClinica, setConclusaoClinica] = useState('');
  const [objetivosTerapeuticos, setObjetivosTerapeuticos] = useState('');

  const carregarPacientes = () => {
    try {
      const resultado = db.getAllSync(
        `SELECT p.*,
          (SELECT COUNT(*) FROM avaliacoes a WHERE a.id_paciente = p.id) +
          (SELECT COUNT(*) FROM avaliacoes_posturais ap WHERE ap.id_paciente = p.id) +
          (SELECT COUNT(*) FROM avaliacoes_cervicais ac WHERE ac.id_paciente = p.id) +
          (SELECT COUNT(*) FROM avaliacoes_adm aa WHERE aa.id_paciente = p.id) AS total_avaliacoes
         FROM pacientes p
         ORDER BY p.id DESC`
      ) as Paciente[];
      setPacientes(resultado);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, []);

  const pacientesExibidos = useMemo(() => {
    let lista = [...pacientes];

    if (busca.trim()) {
      const termo = busca.trim().toLowerCase();
      lista = lista.filter((p) => p.nome.toLowerCase().includes(termo));
    }

    if (aba === 'az') {
      lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    } else if (aba === 'sessoes') {
      lista.sort((a, b) => b.total_avaliacoes - a.total_avaliacoes);
    } else {
      lista.sort((a, b) => b.id - a.id);
    }

    return lista;
  }, [pacientes, busca, aba]);

  const limparFormulario = () => {
    setNome('');
    setIdade('');
    setDataNascimento('');
    setSexo('');
    setDiagnostico('');
    setHistoricoMedico('');
    setAnotacoesClinicas('');
    setConclusaoClinica('');
    setObjetivosTerapeuticos('');
  };

  const salvarPaciente = () => {
    if (!nome.trim()) return;

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    try {
      db.runSync(
        `INSERT INTO pacientes
          (nome, idade, data_nascimento, sexo, data_cadastro, diagnostico, historico_medico, anotacoes_clinicas, conclusao_clinica, objetivos_terapeuticos)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nome,
          idade ? parseInt(idade) : null,
          dataNascimento || null,
          sexo || null,
          dataHoje,
          diagnostico || null,
          historicoMedico || null,
          anotacoesClinicas || null,
          conclusaoClinica || null,
          objetivosTerapeuticos || null,
        ]
      );

      limparFormulario();
      setModalVisible(false);
      carregarPacientes();
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pacientes Cadastrados</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Buscar por nome..."
        placeholderTextColor="#94A3B8"
        value={busca}
        onChangeText={setBusca}
      />

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, aba === 'recentes' && styles.tabBtnActive]}
          onPress={() => setAba('recentes')}
        >
          <Text style={[styles.tabBtnText, aba === 'recentes' && styles.tabBtnTextActive]}>Recentes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aba === 'az' && styles.tabBtnActive]}
          onPress={() => setAba('az')}
        >
          <Text style={[styles.tabBtnText, aba === 'az' && styles.tabBtnTextActive]}>A-Z</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, aba === 'sessoes' && styles.tabBtnActive]}
          onPress={() => setAba('sessoes')}
        >
          <Text style={[styles.tabBtnText, aba === 'sessoes' && styles.tabBtnTextActive]}>Sessões</Text>
        </TouchableOpacity>
      </View>

      <AssinaturaCriador />

      {pacientesExibidos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {busca.trim() ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}
          </Text>
          <Text style={styles.subEmptyText}>
            {busca.trim() ? 'Tente outro termo de busca.' : 'Toque no botão abaixo para adicionar.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={pacientesExibidos}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={[styles.card, pacienteAtivo?.id === item.id && styles.cardAtivo]}>
              <TouchableOpacity
                style={{ flex: 1, flexDirection: 'row' }}
                onPress={() => navigation.navigate('PatientDetail', { id: item.id })}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardNome}>{item.nome}</Text>
                  <Text style={styles.cardDetalhes}>Idade: {item.idade ? `${item.idade} anos` : 'Não informada'}</Text>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardData}>{item.data_cadastro}</Text>
                  <View style={styles.sessoesBadge}>
                    <Text style={styles.sessoesBadgeText}>
                      {item.total_avaliacoes} {item.total_avaliacoes === 1 ? 'sessão' : 'sessões'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnAtivar, pacienteAtivo?.id === item.id && styles.btnAtivarOn]}
                onPress={() => definirPacienteAtivo(pacienteAtivo?.id === item.id ? null : { id: item.id, nome: item.nome })}
              >
                <Text style={[styles.btnAtivarText, pacienteAtivo?.id === item.id && styles.btnAtivarTextOn]}>
                  {pacienteAtivo?.id === item.id ? 'Ativo' : 'Ativar'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Paciente</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Nome completo"
                placeholderTextColor="#94A3B8"
                value={nome}
                onChangeText={setNome}
              />

              <Text style={styles.label}>Idade</Text>
              <TextInput
                style={styles.input}
                placeholder="Idade"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={idade}
                onChangeText={setIdade}
              />

              <Text style={styles.label}>Data de Nascimento</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/AAAA"
                placeholderTextColor="#94A3B8"
                value={dataNascimento}
                onChangeText={setDataNascimento}
              />

              <Text style={styles.label}>Sexo</Text>
              <TextInput
                style={styles.input}
                placeholder="Sexo"
                placeholderTextColor="#94A3B8"
                value={sexo}
                onChangeText={setSexo}
              />

              <Text style={styles.label}>Diagnóstico</Text>
              <TextInput
                style={styles.input}
                placeholder="Diagnóstico"
                placeholderTextColor="#94A3B8"
                value={diagnostico}
                onChangeText={setDiagnostico}
              />

              <Text style={styles.label}>Histórico Médico</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Histórico médico do paciente"
                placeholderTextColor="#94A3B8"
                value={historicoMedico}
                onChangeText={setHistoricoMedico}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Anotações Clínicas</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Anotações clínicas"
                placeholderTextColor="#94A3B8"
                value={anotacoesClinicas}
                onChangeText={setAnotacoesClinicas}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Conclusão Clínica</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Conclusão clínica"
                placeholderTextColor="#94A3B8"
                value={conclusaoClinica}
                onChangeText={setConclusaoClinica}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Objetivos Terapêuticos</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Objetivos terapêuticos"
                placeholderTextColor="#94A3B8"
                value={objetivosTerapeuticos}
                onChangeText={setObjetivosTerapeuticos}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancelar]}
                onPress={() => { setModalVisible(false); limparFormulario(); }}
              >
                <Text style={styles.btnTextCancelar}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, styles.btnSalvar]}
                onPress={salvarPaciente}
              >
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function AssinaturaCriador() {
  return (
    <View style={styles.assinatura}>
      <Image source={require('../../assets/marca/criador.png')} style={styles.assinaturaImg} resizeMode="contain" />
      <Text style={styles.assinaturaApp}>Postural Global</Text>
      <Text style={styles.assinaturaAutor}>Desenvolvido por @fisionofre</Text>
      <TouchableOpacity onPress={() => Linking.openURL('mailto:jrferreiraa22@gmail.com')}>
        <Text style={styles.assinaturaLink}>jrferreiraa22@gmail.com</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('tel:+5532984143217')}>
        <Text style={styles.assinaturaLink}>(32) 98414-3217</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  assinatura: { alignItems: 'center', paddingVertical: 28, marginTop: 20, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  assinaturaImg: { width: 88, height: 132, marginBottom: 10 },
  assinaturaApp: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
  assinaturaAutor: { fontSize: 12, color: '#64748B', marginTop: 3, marginBottom: 8 },
  assinaturaLink: { fontSize: 12, color: '#16A34A', fontWeight: '600', marginTop: 3 },
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', marginBottom: 12, marginTop: 10 },
  searchInput: { backgroundColor: '#FFFFFF', color: '#0F172A', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  tabsRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#F1F5F9' },
  tabBtnActive: { backgroundColor: '#0284C7' },
  tabBtnText: { color: '#64748B', fontWeight: '600', fontSize: 13 },
  tabBtnTextActive: { color: '#FFFFFF' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#64748B', fontSize: 16, fontWeight: 'bold' },
  subEmptyText: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardAtivo: { borderColor: '#22C55E', borderWidth: 2, backgroundColor: '#F0FDF4' },
  btnAtivar: { marginLeft: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  btnAtivarOn: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  btnAtivarText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  btnAtivarTextOn: { color: '#FFFFFF' },
  cardNome: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
  cardDetalhes: { fontSize: 14, color: '#64748B', marginTop: 4 },
  cardRight: { alignItems: 'flex-end' },
  cardData: { fontSize: 12, color: '#94A3B8' },
  sessoesBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 6 },
  sessoesBadgeText: { fontSize: 11, color: '#0284C7', fontWeight: '600' },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#0284C7', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#0284C7', shadowOpacity: 0.4, shadowRadius: 5 },
  fabText: { color: '#FFFFFF', fontSize: 30, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: '85%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6 },
  input: { backgroundColor: '#F8FAFC', color: '#0F172A', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  inputMultiline: { minHeight: 70, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnCancelar: { backgroundColor: '#F1F5F9', marginRight: 8 },
  btnSalvar: { backgroundColor: '#0284C7', marginLeft: 8 },
  btnText: { color: '#FFFFFF', fontWeight: 'bold' },
  btnTextCancelar: { color: '#0F172A', fontWeight: 'bold' }
});
