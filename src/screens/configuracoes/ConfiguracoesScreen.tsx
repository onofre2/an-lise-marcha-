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
      mediaTypes: ['images'],
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
        <Text style={styles.label}>Numero de Registro</Text>
        <TextInput style={styles.input} value={registro} onChangeText={setRegistro} placeholderTextColor="#94A3B8" />
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

        <Text style={styles.refTitulo}>Teste de Adams</Text>
        <Text style={styles.refTexto}>
          A gibosidade e a proeminencia rotacional que aparece no lado convexo
          da curva, com as vertebras rodadas nesse sentido. Estudos de
          rastreamento escolar solicitaram exame radiologico nas medidas acima
          de 5 mm, e a gibosidade toracica mostrou boa associacao com o angulo
          de Cobb toracico. Com escoliometro, considera-se positiva a assimetria
          igual ou maior que 7 graus em criancas com indice de massa corporal
          abaixo do percentil 85, ou igual ou maior que 5 graus naquelas com
          percentil 85 ou acima. A graduacao em leve (ate 2 cm), moderada (ate
          2,5 cm) e acentuada e operacional deste aplicativo, nao normativa. O
          teste e de triagem: a confirmacao da escoliose e a medida do angulo de
          Cobb dependem de radiografia.
          Na vista posterior o desnivel entre os lados e convertido para centimetros
          a partir da altura do paciente; sem altura cadastrada, o achado nao e gerado.
        </Text>

        <Text style={styles.refTitulo}>Criterio de classificacao</Text>
        <Text style={styles.refTexto}>
          Desvios angulares inferiores a 1,5 grau sao considerados alinhamento
          preservado; de 1,5 a menos de 3 graus, desajuste discreto; iguais ou
          superiores a 3 graus, alteracao postural. A literatura de fotogrametria
          demonstra boa confiabilidade do metodo, mas nao estabelece um limiar
          universal de desvio. Os cortes adotados aqui sao criterios operacionais
          de triagem, escolhidos para oferecer a maior precisao possivel sem que
          a variacao natural da marcacao seja interpretada como achado clinico, e
          nao constituem valores diagnosticos universais. Medidas com referencia
          propria na literatura, como POTSI, ATSI, angulo craniovertebral e
          angulo Q, mantem seus proprios pontos de corte.
        </Text>

        <Text style={styles.refTitulo}>Angulo Q</Text>
        <Text style={styles.refTexto}>
          Angulo formado no centro da patela entre a linha vinda da espinha iliaca
          antero-superior e a linha vinda da tuberosidade da tibia. Referencia usual:
          cerca de 13 graus em homens e 18 em mulheres; acima de 20 graus ha maior
          incidencia de alteracoes femoropatelares. Ressalva: e classicamente medido
          em decubito dorsal e nao ha consenso universal sobre valores normais. Aqui
          e obtido por fotogrametria em ortostatismo, servindo como triagem.
        </Text>

        <Text style={styles.refTitulo}>Inclinacao Pelvica</Text>
        <Text style={styles.refTexto}>
          Angulo da linha entre a espinha iliaca antero-superior e a postero-superior
          em relacao a horizontal. Faixa usualmente descrita entre 10 e 15 graus de
          anteversao, com variacao entre estudos.
        </Text>

        <Text style={styles.refTitulo}>Goniometria Clinica</Text>
        <Text style={styles.refTexto}>Valores normativos de amplitude de movimento (referencia AAOS/Kendall).</Text>

        <Text style={styles.refTitulo}>Fases do Ciclo da Marcha</Text>
        <Text style={styles.refTexto}>Perry, J. Gait Analysis: Normal and Pathological Function. SLACK Incorporated.</Text>
        <Text style={styles.refTexto}>
          A analise da marcha deste aplicativo usa apenas o plano sagital (vista lateral),
          onde os angulos de flexao e extensao de quadril, joelho e tornozelo sao mensuraveis.
          Achados do plano frontal, como assimetrias e desvios laterais, sao cobertos pelo
          modulo de avaliacao postural.
        </Text>

        <Text style={styles.refTitulo}>Confiabilidade da analise bidimensional</Text>
        <Text style={styles.refTexto}>
          Estudos que compararam a analise bidimensional por video de celular com
          sistemas tridimensionais encontraram diferencas medias de cerca de 5 graus
          no joelho e 3 graus no tornozelo. As medidas de quadril excederam o
          controle em cerca de 40 graus, com vies sistematico. Por isso o angulo de
          quadril deve ser lido com reserva e serve para acompanhar a evolucao do
          proprio paciente, nao como valor absoluto.
        </Text>

        <Text style={styles.refTitulo}>Protocolo de filmagem</Text>
        <Text style={styles.refTexto}>
          Parametros usados nos estudos de validacao: gravacao a 60 quadros por
          segundo em alta definicao, celular fixo em tripe a cerca de 3 metros da
          passarela e na altura do quadril, percurso plano de aproximadamente 6
          metros, iluminacao constante, paciente descalco em velocidade confortavel
          e olhar em ponto fixo a altura dos olhos.
        </Text>
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
