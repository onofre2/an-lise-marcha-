import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import db from '../../services/database';

interface Config {
  nome: string;
  registro: string;
  logo_uri: string | null;
  assinatura_uri: string | null;
}

export default function ConfiguracoesScreen() {
  const [nome, setNome] = useState('');
  const [registro, setRegistro] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [assinaturaUri, setAssinaturaUri] = useState<string | null>(null);

  const carregar = () => {
    try {
      const resultado = db.getAllSync('SELECT * FROM configuracoes_terapeuta WHERE id = 1') as Config[];
      if (resultado.length > 0) {
        setNome(resultado[0].nome || '');
        setRegistro(resultado[0].registro || '');
        setLogoUri(resultado[0].logo_uri);
        setAssinaturaUri(resultado[0].assinatura_uri);
      }
    } catch (error) {
      console.error('Erro ao carregar configuracoes:', error);
    }
  };

  useFocusEffect(useCallback(() => { carregar(); }, []));

  const salvar = () => {
    try {
      db.runSync(
        `INSERT INTO configuracoes_terapeuta (id, nome, registro, logo_uri, assinatura_uri)
         VALUES (1, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET nome = ?, registro = ?, logo_uri = ?, assinatura_uri = ?`,
        [nome, registro, logoUri, assinaturaUri, nome, registro, logoUri, assinaturaUri]
      );
      Alert.alert('Sucesso', 'Configuracoes salvas! Elas aparecerao nos proximos relatorios PDF.');
    } catch (error) {
      console.error('Erro ao salvar configuracoes:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar as configuracoes.');
    }
  };

  const escolherImagem = async (tipo: 'logo' | 'assinatura') => {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled && resultado.assets && resultado.assets[0]) {
      if (tipo === 'logo') setLogoUri(resultado.assets[0].uri);
      else setAssinaturaUri(resultado.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Dados do Terapeuta</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Nome Completo</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Seu nome" placeholderTextColor="#94A3B8" />
        <Text style={styles.label}>Numero de Registro (CREFITO)</Text>
        <TextInput style={styles.input} value={registro} onChangeText={setRegistro} placeholder="Ex: CREFITO-4 123456" placeholderTextColor="#94A3B8" />
      </View>

      <Text style={styles.sectionTitle}>Logo da Clinica</Text>
      <TouchableOpacity style={styles.imagemBox} onPress={() => escolherImagem('logo')}>
        {logoUri ? (
          <Image source={{ uri: logoUri }} style={styles.imagemPreview} resizeMode="contain" />
        ) : (
          <Text style={styles.imagemPlaceholder}>Toque para escolher uma imagem</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Assinatura</Text>
      <TouchableOpacity style={styles.imagemBox} onPress={() => escolherImagem('assinatura')}>
        {assinaturaUri ? (
          <Image source={{ uri: assinaturaUri }} style={styles.imagemPreview} resizeMode="contain" />
        ) : (
          <Text style={styles.imagemPlaceholder}>Toque para escolher uma imagem</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.dica}>Essas imagens aparecerao em tamanho reduzido no rodape dos relatorios PDF gerados.</Text>

      <TouchableOpacity style={styles.btnSalvar} onPress={salvar}>
        <Text style={styles.btnSalvarText}>Salvar Configuracoes</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Referencias Cientificas</Text>
      <View style={styles.cardReferencias}>
        <Text style={styles.refTitulo}>Protocolo SAPO</Text>
        <Text style={styles.refTexto}>Duarte et al. (2005). Base do modulo de avaliacao postural.</Text>

        <Text style={styles.refTitulo}>POTSI / ATSI</Text>
        <Text style={styles.refTexto}>Suzuki et al. (1999). Indices de simetria de tronco.</Text>

        <Text style={styles.refTitulo}>Angulo Craniovertebral</Text>
        <Text style={styles.refTexto}>Padrao clinico para avaliacao de postura de cabeca anteriorizada.</Text>

        <Text style={styles.refTitulo}>Goniometria Clinica</Text>
        <Text style={styles.refTexto}>Valores normativos de amplitude de movimento (referencia AAOS/Kendall).</Text>

        <Text style={styles.refTitulo}>Fases do Ciclo da Marcha</Text>
        <Text style={styles.refTexto}>Perry, J. Gait Analysis: Normal and Pathological Function.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginTop: 20, marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  label: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, fontSize: 14, color: '#0F172A' },
  imagemBox: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', height: 100, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  imagemPreview: { width: '90%', height: '90%' },
  imagemPlaceholder: { color: '#94A3B8', fontSize: 13 },
  dica: { color: '#94A3B8', fontSize: 11, marginTop: 8, lineHeight: 16 },
  btnSalvar: { backgroundColor: '#22C55E', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  btnSalvarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  cardReferencias: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  refTitulo: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 10 },
  refTexto: { fontSize: 12, color: '#64748B', marginTop: 2, lineHeight: 17 },
});
