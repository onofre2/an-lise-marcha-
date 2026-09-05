import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

export default function CameraCaptureScreen({ route, navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<any>(null);
  const { pacienteId, angulo } = route.params || { pacienteId: 1, angulo: 'anterior' };

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>Carregando permissões...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Precisamos de acesso à câmera para filmar a marcha.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Conceder Permissão</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.btnSecundario]} onPress={escolherDaGaleria}>
          <Text style={styles.btnText}>Escolher da Galeria</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function escolherDaGaleria() {
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (!resultado.canceled && resultado.assets && resultado.assets[0]) {
      navigation.navigate('VideoEdit', { videoUri: resultado.assets[0].uri, pacienteId, angulo });
    }
  }

  const gerenciarGravacao = async () => {
    if (isRecording) {
      if (cameraRef.current) {
        cameraRef.current.stopRecording();
      }
      return;
    }

    if (cameraRef.current) {
      try {
        setIsRecording(true);

        setTimeout(() => {
          if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
            Alert.alert("Tempo Esgotado", "Gravação interrompida no limite seguro de 25 segundos.");
          }
        }, 25000);

        const video = await cameraRef.current.recordAsync({
          maxDuration: 25,
          quality: '720p'
        });

        setIsRecording(false);

        navigation.navigate('VideoEdit', { videoUri: video.uri, pacienteId, angulo });

      } catch (error) {
        console.error("Erro ao gravar vídeo:", error);
        setIsRecording(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} mode="video">
        <View style={styles.overlayContainer}>
          <View style={styles.hudHeader}>
            <Text style={styles.hudText}>Paciente ID: {pacienteId}</Text>
            <Text style={[styles.hudText, { textTransform: 'uppercase', color: '#0284C7' }]}>Ângulo: {angulo}</Text>
          </View>

          <View style={styles.guideBox}>
            <Text style={styles.guideText}>Distância: 1 Metro | Cintura para baixo</Text>
          </View>

          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.recordButton, isRecording && styles.recordingActive]}
              onPress={gerenciarGravacao}
            >
              <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
            </TouchableOpacity>
            <Text style={styles.statusText}>
              {isRecording ? "GRAVANDO... CORTA EM 25s" : "TOQUE PARA INICIAR (MÁX 25s)"}
            </Text>
            {!isRecording && (
              <TouchableOpacity style={styles.galeriaButton} onPress={escolherDaGaleria}>
                <Text style={styles.galeriaText}>Escolher da Galeria</Text>
              </TouchableOpacity>
            )}
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
  btn: { backgroundColor: '#0284C7', padding: 14, borderRadius: 8, alignSelf: 'center', marginTop: 12 },
  btnSecundario: { backgroundColor: '#475569' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  overlayContainer: { flex: 1, justifyContent: 'space-between', padding: 20, backgroundColor: 'rgba(0,0,0,0.15)' },
  hudHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(248,250,252,0.92)', padding: 12, borderRadius: 8, marginTop: 10 },
  hudText: { color: '#0F172A', fontWeight: 'bold', fontSize: 12 },
  guideBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#10B981', borderRadius: 12, height: '45%', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10 },
  guideText: { color: '#FFFFFF', backgroundColor: 'rgba(15,23,42,0.75)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, fontSize: 11, fontWeight: 'bold' },
  actionContainer: { alignItems: 'center', marginBottom: 20 },
  recordButton: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF' },
  recordingActive: { borderColor: '#EF4444' },
  recordIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EF4444' },
  stopIcon: { width: 30, height: 30, borderRadius: 4, backgroundColor: '#FFF' },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginTop: 10, textShadowColor: '#000', textShadowRadius: 4 },
  galeriaButton: { backgroundColor: 'rgba(248,250,252,0.92)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginTop: 14 },
  galeriaText: { color: '#0284C7', fontWeight: 'bold', fontSize: 13 },
});
