import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function AdamsCaptureScreen({ route, navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const { pacienteId } = route.params as { pacienteId: number };

  async function escolherDaGaleria() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!resultado.canceled && resultado.assets && resultado.assets[0]) {
      navigation.navigate('AdamsMarking', { fotoUri: resultado.assets[0].uri, pacienteId });
    }
  }

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Carregando permissoes...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos de acesso a camera para o teste de inclinacao.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permissao</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecundario]} onPress={escolherDaGaleria}>
          <Text style={styles.btnText}>Escolher da Galeria</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tirarFoto = async () => {
    if (cameraRef.current) {
      try {
        const foto = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        navigation.navigate('AdamsMarking', { fotoUri: foto.uri, pacienteId });
      } catch (error) {
        console.error('Erro ao tirar foto:', error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <Text style={styles.headerText}>Paciente inclinado a frente, visto por tras</Text>
          </View>
          <View style={styles.guideBox}>
            <Text style={styles.guideText}>Enquadre o dorso do paciente</Text>
          </View>
          <View style={styles.acoes}>
            <TouchableOpacity style={styles.captureButton} onPress={tirarFoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.galeriaButton} onPress={escolherDaGaleria}>
              <Text style={styles.galeriaText}>Escolher da Galeria</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  text: { color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  btn: { backgroundColor: '#22C55E', padding: 14, borderRadius: 10, alignSelf: 'center', marginTop: 12 },
  btnSecundario: { backgroundColor: '#475569' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  overlay: { flex: 1, justifyContent: 'space-between', padding: 20 },
  header: { backgroundColor: 'rgba(248,250,252,0.92)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 10, alignSelf: 'center' },
  headerText: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
  guideBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#22C55E', borderRadius: 16, flex: 1, marginVertical: 20 },
  guideText: { color: '#FFFFFF', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
  acoes: { alignItems: 'center', marginBottom: 20, gap: 12 },
  captureButton: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF' },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#22C55E' },
  galeriaButton: { backgroundColor: 'rgba(248,250,252,0.92)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  galeriaText: { color: '#16A34A', fontWeight: 'bold', fontSize: 13 },
});
