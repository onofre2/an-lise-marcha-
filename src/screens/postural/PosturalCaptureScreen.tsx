import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Vista } from '../../constants/posturalPoints';

export default function PosturalCaptureScreen({ route, navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const { pacienteId, vista, modo } = route.params as {
    pacienteId: number;
    vista: Vista;
    modo: 'rapida' | 'completa';
  };

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Carregando permissões...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos de acesso à câmera para a avaliação postural.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permissão</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const tirarFoto = async () => {
    if (cameraRef.current) {
      try {
        const foto = await cameraRef.current.takePictureAsync({ quality: 0.8 });
        navigation.navigate('PosturalMarking', { fotoUri: foto.uri, pacienteId, vista, modo });
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
            <Text style={styles.headerText}>Vista: {vista.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <View style={styles.guideBox}>
            <Text style={styles.guideText}>Enquadre o corpo inteiro</Text>
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
  guideText: { color: '#FFFFFF', textAlign: 'center', marginTop: 10, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4 },
  captureButton: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF', alignSelf: 'center', marginBottom: 20 },
  captureInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#22C55E' },
});
