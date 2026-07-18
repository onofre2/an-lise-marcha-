import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';

export default function CameraCaptureScreen({ route, navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const cameraRef = useRef<any>(null);

  // Pega os parâmetros passados da tela de avaliação
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
      </View>
    );
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
        
        // Dispara cronômetro para cortar em 15 segundos obrigatoriamente
        setTimeout(() => {
          if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
            Alert.alert("Tempo Esgotado", "Gravação interrompida no limite seguro de 15 segundos.");
          }
        }, 15000);

        const video = await cameraRef.current.recordAsync({
          maxDuration: 15,
          quality: '720p'
        });

        setIsRecording(false);
        
        // Vídeo gravado com sucesso no cache temporário!
        // Redireciona direto para a tela de edição biomecânica enviando o arquivo
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
            <Text style={[styles.hudText, { textTransform: 'uppercase', color: '#38BDF8' }]}>Ângulo: {angulo}</Text>
          </View>

          {/* Guia Visual do Protocolo Clínico */}
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
              {isRecording ? "GRAVANDO... CORTA EM 15s" : "TOQUE PARA INICIAR (MÁX 15s)"}
            </Text>
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
  btn: { backgroundColor: '#0284C7', padding: 14, borderRadius: 8, alignSelf: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  overlayContainer: { flex: 1, justifyContent: 'space-between', padding: 20, backgroundColor: 'rgba(0,0,0,0.15)' },
  hudHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(15,23,42,0.8)', padding: 12, borderRadius: 8, marginTop: 10 },
  hudText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  guideBox: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#38BDF8', borderRadius: 12, height: '45%', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 10 },
  guideText: { color: '#38BDF8', backgroundColor: 'rgba(15,23,42,0.8)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, fontSize: 11, fontWeight: 'bold' },
  actionContainer: { alignItems: 'center', marginBottom: 20 },
  recordButton: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FFF' },
  recordingActive: { borderColor: '#EF4444' },
  recordIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EF4444' },
  stopIcon: { width: 30, height: 30, borderRadius: 4, backgroundColor: '#FFF' },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginTop: 10, textShadowColor: '#000', textShadowRadius: 4 }
});
