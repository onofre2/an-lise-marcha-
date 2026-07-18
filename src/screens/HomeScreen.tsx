import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal } from 'react-native';
import db from '../services/database';

interface Paciente {
  id: number;
  nome: string;
  idade: number;
  data_cadastro: string;
}

export default function HomeScreen() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [nome, setNome] = useState('');
  const [idade, setIdade] = useState('');

  // Função para buscar pacientes no banco de dados
  const carregarPacientes = () => {
    try {
      const resultado = db.getAllSync('SELECT * FROM pacientes ORDER BY id DESC') as Paciente[];
      setPacientes(resultado);
    } catch (error) {
      console.error("Erro ao buscar pacientes:", error);
    }
  };

  // Carrega a lista assim que a tela abre
  useEffect(() => {
    carregarPacientes();
  }, []);

  // Função para salvar um novo paciente
  const salvarPaciente = () => {
    if (!nome.trim()) return;

    const dataHoje = new Date().toLocaleDateString('pt-BR');
    try {
      db.runSync(
        'INSERT INTO pacientes (nome, idade, data_cadastro) VALUES (?, ?, ?)',
        [nome, idade ? parseInt(idade) : null, dataHoje]
      );
      
      // Limpa os campos e fecha o modal
      setNome('');
      setIdade('');
      setModalVisible(false);
      
      // Atualiza a lista na tela
      carregarPacientes();
    } catch (error) {
      console.error("Erro ao salvar paciente:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pacientes Cadastrados</Text>

      {pacientes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nenhum paciente encontrado.</Text>
          <Text style={styles.subEmptyText}>Toque no botão abaixo para adicionar.</Text>
        </View>
      ) : (
        <FlatList
          data={pacientes}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View>
                <Text style={styles.cardNome}>{item.nome}</Text>
                <Text style={styles.cardDetalhes}>Idade: {item.idade ? `${item.idade} anos` : 'Não informada'}</Text>
              </View>
              <Text style={styles.cardData}>{item.data_cadastro}</Text>
            </View>
          )}
        />
      )}

      {/* Botão Flutuante para Adicionar Paciente */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal de Cadastro */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Paciente</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nome Completo"
              placeholderTextColor="#64748B"
              value={nome}
              onChangeText={setNome}
            />

            <TextInput
              style={styles.input}
              placeholder="Idade"
              placeholderTextColor="#64748B"
              keyboardType="numeric"
              value={idade}
              onChangeText={setIdade}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.btn, styles.btnCancelar]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20, marginTop: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#94A3B8', fontSize: 16, fontWeight: 'bold' },
  subEmptyText: { color: '#64748B', fontSize: 14, marginTop: 4 },
  card: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  cardNome: { fontSize: 16, fontWeight: 'bold', color: '#F8FAFC' },
  cardDetalhes: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
  cardData: { fontSize: 12, color: '#64748B' },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#0284C7', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#0284C7', shadowOpacity: 0.4, shadowRadius: 5 },
  fabText: { color: '#FFFFFF', fontSize: 30, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16 },
  input: { backgroundColor: '#0F172A', color: '#F8FAFC', padding: 14, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btn: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnCancelar: { backgroundColor: '#475569', marginRight: 8 },
  btnSalvar: { backgroundColor: '#0284C7', marginLeft: 8 },
  btnText: { color: '#FFFFFF', fontWeight: 'bold' }
});
