import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MOVIMENTOS } from '../../constants/movimentos';

export default function ADMCaptureScreen({ route, navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const { pacienteId, movimentoId } = route.params as { pacienteId: number; movimentoId: string };

  const movimento = MOVIMENTOS.find(m => m.id === movimentoId);

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Carregando permissoes...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos de acesso a camera para medir a amplitude de movimento.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permissao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tirarFoto = async () => {
    if (cameraRef.current) {
      try {
        const foto = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        navigation.navigate('ADMMarking', { fotoUri: foto.uri, pacienteId, movimentoId });
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
            <Text style={styles.headerText}>{movimento ? movimento.nome : 'Movimento'}</Text>
          </View>
          <View style={styles.guideBox}>
            <Text style={styles.guideText}>Enquadre a articulacao avaliada</Text>
          </View>
          <TouchableOpacity style={styles.captureButton} onPress={tirarFoto}>
            <View style={styles.captureInner} />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  text: { color: '#FFF', fontSize: 16, textAlign: 'center', marginBottom: 20, paddingHorizontal: 20 },
  btn: { backgroundColor: '#22C55E', padding: 14, borderRadius: 10, alignSelf: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  overlay: { flex: 1, justifyContent: 'space-between', padding: 20 },
  header: { backgroundColor: 'rgba(248,250,252,0.92)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginTop: 10, alignSelf: 'center' },
  headerText: { color: '#16A34A', fontWeight: 'bold', fontSize: 14 },
  guideBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#22C55E', borderRadius: 16, flex: 1, marginVertical: 20 },
  guideText: { color: '#FFFFFF', textAlign: 'center', marginTop: 10, fontWeight: 'bold' },
  captureButton: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF', alignSelf: 'center', marginBottom: 20 },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#22C55E' },
});
