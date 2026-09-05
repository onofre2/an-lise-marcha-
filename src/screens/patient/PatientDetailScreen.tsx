import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import db from '../../services/database';
import { gerarRelatorioCompleto } from '../../services/pdfService';

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
}

interface ItemAvaliacao {
  id: number;
  tipo: 'marcha' | 'postural' | 'cervical' | 'adm' | 'adams';
  data_avaliacao: string;
  detalhe: string;
  info_extra?: string;
}

export default function PatientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { id } = route.params;

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [grupos, setGrupos] = useState<{ data: string; itens: ItemAvaliacao[] }[]>([]);

  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [historicoMedico, setHistoricoMedico] = useState('');
  const [anotacoesClinicas, setAnotacoesClinicas] = useState('');
  const [conclusaoClinica, setConclusaoClinica] = useState('');
  const [objetivosTerapeuticos, setObjetivosTerapeuticos] = useState('');

  const carregarPaciente = () => {
    try {
      const resultado = db.getAllSync('SELECT * FROM pacientes WHERE id = ?', [id]) as Paciente[];
      if (resultado.length > 0) {
        setPaciente(resultado[0]);
      }
    } catch (error) {
      console.error("Erro ao buscar paciente:", error);
    }
  };

  const carregarHistorico = () => {
    try {
      const marchas = db.getAllSync(
        'SELECT id, angulo, data_avaliacao FROM avaliacoes WHERE id_paciente = ?',
        [id]
      ) as { id: number; angulo: string; data_avaliacao: string }[];

      const posturais = db.getAllSync(
        'SELECT id, vista, modo, data_avaliacao, medidas_json FROM avaliacoes_posturais WHERE id_paciente = ?',
        [id]
      ) as { id: number; vista: string; modo: string; data_avaliacao: string; medidas_json: string | null }[];

      const cervicais = db.getAllSync(
      'SELECT id, angulo, data_avaliacao FROM avaliacoes_cervicais WHERE id_paciente = ?',
      [id]
    ) as { id: number; angulo: number; data_avaliacao: string }[];

    const adms = db.getAllSync(
      'SELECT id, movimento, angulo, referencia, data_avaliacao FROM avaliacoes_adm WHERE id_paciente = ?',
      [id]
    ) as { id: number; movimento: string; angulo: number; referencia: number; data_avaliacao: string }[];

    const adamses = db.getAllSync(
      'SELECT id, angulo, lado_elevado, data_avaliacao FROM avaliacoes_adams WHERE id_paciente = ?',
      [id]
    ) as { id: number; angulo: number; lado_elevado: string; data_avaliacao: string }[];

    const itensMarcha: ItemAvaliacao[] = marchas.map((m) => ({
        id: m.id,
        tipo: 'marcha',
        data_avaliacao: m.data_avaliacao,
        detalhe: `Marcha — ${m.angulo}`,
      }));

      const itensPostural: ItemAvaliacao[] = posturais.map((p) => {
        let qtdMedidas = 0;
        if (p.medidas_json) {
          try {
            const parsed = JSON.parse(p.medidas_json);
            qtdMedidas = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
          } catch {
            qtdMedidas = 0;
          }
        }
        return {
          id: p.id,
          tipo: 'postural',
          data_avaliacao: p.data_avaliacao,
          detalhe: `Postural — ${p.vista} (${p.modo})`,
          info_extra: qtdMedidas > 0 ? `${qtdMedidas} medida${qtdMedidas === 1 ? '' : 's'}` : undefined,
        };
      });

      const itensCervical: ItemAvaliacao[] = cervicais.map((c2) => ({
      id: c2.id,
      tipo: 'cervical',
      data_avaliacao: c2.data_avaliacao,
      detalhe: 'Cervical — Angulo Craniovertebral',
      info_extra: `${c2.angulo} graus`,
    }));

    const itensADM: ItemAvaliacao[] = adms.map((a2) => ({
      id: a2.id,
      tipo: 'adm',
      data_avaliacao: a2.data_avaliacao,
      detalhe: `ADM — ${a2.movimento}`,
      info_extra: `${a2.angulo}/${a2.referencia} graus`,
    }));

    const itensAdams: ItemAvaliacao[] = adamses.map((a3) => ({
      id: a3.id,
      tipo: 'adams',
      data_avaliacao: a3.data_avaliacao,
      detalhe: 'Adams — Teste de Inclinacao',
      info_extra: `${a3.angulo} graus | lado ${a3.lado_elevado || '-'}`,
    }));

    const todos = [...itensMarcha, ...itensPostural, ...itensCervical, ...itensADM, ...itensAdams];

      const mapa = new Map<string, ItemAvaliacao[]>();
      todos.forEach((item) => {
        const lista = mapa.get(item.data_avaliacao) || [];
        lista.push(item);
        mapa.set(item.data_avaliacao, lista);
      });

      const gruposOrdenados = Array.from(mapa.entries())
        .map(([data, itens]) => ({ data, itens }))
        .sort((a, b) => {
          const [da, ma, ya] = a.data.split('/').map(Number);
          const [db_, mb, yb] = b.data.split('/').map(Number);
          const dateA = new Date(ya || 0, (ma || 1) - 1, da || 1);
          const dateB = new Date(yb || 0, (mb || 1) - 1, db_ || 1);
          return dateB.getTime() - dateA.getTime();
        });

      setGrupos(gruposOrdenados);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarPaciente();
      carregarHistorico();
    }, [id])
  );

  const abrirEdicao = () => {
    if (!paciente) return;
    setNome(paciente.nome || '');
    setIdade(paciente.idade ? String(paciente.idade) : '');
    setDataNascimento(paciente.data_nascimento || '');
    setSexo(paciente.sexo || '');
    setDiagnostico(paciente.diagnostico || '');
    setHistoricoMedico(paciente.historico_medico || '');
    setAnotacoesClinicas(paciente.anotacoes_clinicas || '');
    setConclusaoClinica(paciente.conclusao_clinica || '');
    setObjetivosTerapeuticos(paciente.objetivos_terapeuticos || '');
    setEditModalVisible(true);
  };

  const salvarEdicao = () => {
    if (!nome.trim() || !paciente) return;
    try {
      db.runSync(
        `UPDATE pacientes SET
          nome = ?, idade = ?, data_nascimento = ?, sexo = ?,
          diagnostico = ?, historico_medico = ?, anotacoes_clinicas = ?,
          conclusao_clinica = ?, objetivos_terapeuticos = ?
         WHERE id = ?`,
        [
          nome,
          idade ? parseInt(idade) : null,
          dataNascimento || null,
          sexo || null,
          diagnostico || null,
          historicoMedico || null,
          anotacoesClinicas || null,
          conclusaoClinica || null,
          objetivosTerapeuticos || null,
          id,
        ]
      );
      setEditModalVisible(false);
      carregarPaciente();
    } catch (error) {
      console.error("Erro ao atualizar paciente:", error);
    }
  };

  const confirmarExclusao = () => {
    Alert.alert(
      'Excluir Paciente',
      `Tem certeza que deseja excluir ${paciente?.nome}? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => excluirPaciente() },
      ]
    );
  };

  const excluirPaciente = () => {
    try {
      db.runSync('DELETE FROM pacientes WHERE id = ?', [id]);
      navigation.goBack();
    } catch (error) {
      console.error("Erro ao excluir paciente:", error);
    }
  };

  if (!paciente) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'‹ Voltar'}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{paciente.nome.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.nome}>{paciente.nome}</Text>
          <Text style={styles.subInfo}>
            {paciente.idade ? `${paciente.idade} anos` : 'Idade não informada'}
            {paciente.sexo ? ` • ${paciente.sexo}` : ''}
          </Text>
          {paciente.data_nascimento ? (
            <Text style={styles.subInfo}>Nascimento: {paciente.data_nascimento}</Text>
          ) : null}
          <Text style={styles.cadastroInfo}>Cadastrado em {paciente.data_cadastro}</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={abrirEdicao}>
            <Text style={styles.actionBtnText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDisabled]} disabled={true}>
            <Text style={styles.actionBtnTextDisabled}>Comparar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnExcluir]} onPress={confirmarExclusao}>
            <Text style={styles.actionBtnTextExcluir}>Excluir</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.btnPdf} onPress={async () => {
          try {
            await gerarRelatorioCompleto(paciente.id);
          } catch (e) {
            Alert.alert('Erro', 'Nao foi possivel gerar o relatorio.');
          }
        }}>
          <Text style={styles.btnPdfText}>Gerar Relatorio PDF</Text>
        </TouchableOpacity>

        {(paciente.diagnostico || paciente.historico_medico) ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Informações Clínicas</Text>
            {paciente.diagnostico ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Diagnóstico</Text>
                <Text style={styles.infoText}>{paciente.diagnostico}</Text>
              </View>
            ) : null}
            {paciente.historico_medico ? (
              <View style={styles.infoBlock}>
                <Text style={styles.infoLabel}>Histórico Médico</Text>
                <Text style={styles.infoText}>{paciente.historico_medico}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {paciente.anotacoes_clinicas ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anotações Clínicas</Text>
            <Text style={styles.infoText}>{paciente.anotacoes_clinicas}</Text>
          </View>
        ) : null}

        {paciente.conclusao_clinica ? (
          <View style={[styles.section, styles.highlightYellow]}>
            <Text style={styles.sectionTitle}>Conclusão Clínica</Text>
            <Text style={styles.infoText}>{paciente.conclusao_clinica}</Text>
          </View>
        ) : null}

        {paciente.objetivos_terapeuticos ? (
          <View style={[styles.section, styles.highlightGreen]}>
            <Text style={styles.sectionTitle}>Objetivos Terapêuticos</Text>
            <Text style={styles.infoText}>{paciente.objetivos_terapeuticos}</Text>
          </View>
        ) : null}
      {grupos.length > 0 ? (
        <View style={styles.historicoSection}>
          <Text style={styles.sectionTitle}>Histórico de Avaliações</Text>
          {grupos.map((grupo, idx) => (
            <View key={grupo.data} style={styles.grupoData}>
              <Text style={styles.grupoDataTitulo}>
                Avaliação {grupos.length - idx} — {grupo.data}
              </Text>
              {grupo.itens.map((item) => (
                <TouchableOpacity key={`${item.tipo}-${item.id}`} style={styles.itemAvaliacao} activeOpacity={0.7} onPress={() => navigation.navigate('AvaliacaoDetail', { tipo: item.tipo, id: item.id })}>
                  <View style={[styles.itemBadge, item.tipo === 'marcha' ? styles.itemBadgeMarcha : styles.itemBadgePostural]}>
                    <Text style={styles.itemBadgeText}>{item.tipo === 'marcha' ? 'Marcha' : item.tipo === 'cervical' ? 'Cervical' : item.tipo === 'adm' ? 'ADM' : item.tipo === 'adams' ? 'Adams' : 'Postural'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemDetalhe}>{item.detalhe}</Text>
                    {item.info_extra ? <Text style={styles.itemInfoExtra}>{item.info_extra}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.historicoSection}>
          <Text style={styles.sectionTitle}>Histórico de Avaliações</Text>
          <Text style={styles.semHistorico}>Nenhuma avaliação registrada ainda.</Text>
        </View>
      )}
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Paciente</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput style={styles.input} placeholderTextColor="#94A3B8" value={nome} onChangeText={setNome} />

              <Text style={styles.label}>Idade</Text>
              <TextInput style={styles.input} placeholderTextColor="#94A3B8" keyboardType="numeric" value={idade} onChangeText={setIdade} />

              <Text style={styles.label}>Data de Nascimento</Text>
              <TextInput style={styles.input} placeholder="DD/MM/AAAA" placeholderTextColor="#94A3B8" value={dataNascimento} onChangeText={setDataNascimento} />

              <Text style={styles.label}>Sexo</Text>
              <TextInput style={styles.input} placeholderTextColor="#94A3B8" value={sexo} onChangeText={setSexo} />

              <Text style={styles.label}>Diagnóstico</Text>
              <TextInput style={styles.input} placeholderTextColor="#94A3B8" value={diagnostico} onChangeText={setDiagnostico} />

              <Text style={styles.label}>Histórico Médico</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholderTextColor="#94A3B8" value={historicoMedico} onChangeText={setHistoricoMedico} multiline numberOfLines={3} />

              <Text style={styles.label}>Anotações Clínicas</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholderTextColor="#94A3B8" value={anotacoesClinicas} onChangeText={setAnotacoesClinicas} multiline numberOfLines={3} />

              <Text style={styles.label}>Conclusão Clínica</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholderTextColor="#94A3B8" value={conclusaoClinica} onChangeText={setConclusaoClinica} multiline numberOfLines={3} />

              <Text style={styles.label}>Objetivos Terapêuticos</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} placeholderTextColor="#94A3B8" value={objetivosTerapeuticos} onChangeText={setObjetivosTerapeuticos} multiline numberOfLines={3} />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.btnTextCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSalvar]} onPress={salvarEdicao}>
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  loadingContainer: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748B', fontSize: 16 },
  backButton: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  backButtonText: { color: '#0284C7', fontSize: 16, fontWeight: '600' },
  header: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#0284C7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold' },
  nome: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  subInfo: { fontSize: 14, color: '#64748B', marginTop: 2 },
  cadastroInfo: { fontSize: 12, color: '#94A3B8', marginTop: 8 },
  btnPdf: { backgroundColor: '#22C55E', marginHorizontal: 20, marginBottom: 16, padding: 15, borderRadius: 14, alignItems: 'center' },
  btnPdfText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 12, gap: 8 },
  actionBtn: { flex: 1, backgroundColor: '#0284C7', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
  actionBtnDisabled: { backgroundColor: '#E2E8F0' },
  actionBtnTextDisabled: { color: '#94A3B8', fontWeight: 'bold', fontSize: 13 },
  actionBtnExcluir: { backgroundColor: '#FEE2E2' },
  actionBtnTextExcluir: { color: '#DC2626', fontWeight: 'bold', fontSize: 13 },
  section: { backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 },
  infoBlock: { marginBottom: 10 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', marginBottom: 2 },
  infoText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  highlightYellow: { backgroundColor: '#FEFCE8', borderColor: '#FDE68A' },
  highlightGreen: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
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
  btnTextCancelar: { color: '#0F172A', fontWeight: 'bold' },
  historicoSection: { marginHorizontal: 20, marginTop: 16 },
  semHistorico: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
  grupoData: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 14, marginTop: 10 },
  grupoDataTitulo: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginBottom: 10 },
  itemAvaliacao: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  itemBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginRight: 10 },
  itemBadgeMarcha: { backgroundColor: '#EFF6FF' },
  itemBadgePostural: { backgroundColor: '#F0FDF4' },
  itemBadgeText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  itemDetalhe: { fontSize: 14, color: '#0F172A' },
  itemInfoExtra: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
