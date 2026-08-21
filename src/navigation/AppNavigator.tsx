import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import PatientDetailScreen from '../screens/patient/PatientDetailScreen';
import EvaluationScreen from '../screens/EvaluationScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import VideoEditScreen from '../screens/VideoEditScreen';
import PosturalHomeScreen from '../screens/postural/PosturalHomeScreen';
import PosturalCaptureScreen from '../screens/postural/PosturalCaptureScreen';
import PosturalMarkingScreen from '../screens/postural/PosturalMarkingScreen';
import PosturalResultScreen from '../screens/postural/PosturalResultScreen';
import CervicalHomeScreen from '../screens/cervical/CervicalHomeScreen';
import CervicalCaptureScreen from '../screens/cervical/CervicalCaptureScreen';
import CervicalMarkingScreen from '../screens/cervical/CervicalMarkingScreen';
import CervicalResultScreen from '../screens/cervical/CervicalResultScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Fluxo interno da aba de Avaliação de Marcha (Avaliação -> Câmera -> Edição)
function PacientesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PacientesHome" component={HomeScreen} />
      <Stack.Screen name="PatientDetail" component={PatientDetailScreen} />
    </Stack.Navigator>
  );
}

function EvaluationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EvaluationHome" component={EvaluationScreen} />
      <Stack.Screen name="CameraCapture" component={CameraCaptureScreen} />
      <Stack.Screen name="VideoEdit" component={VideoEditScreen} />
    </Stack.Navigator>
  );
}

// Fluxo interno da aba de Avaliação Postural (Início -> Câmera -> Marcação -> Resultado)
function PosturalStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PosturalHome" component={PosturalHomeScreen} />
      <Stack.Screen name="PosturalCapture" component={PosturalCaptureScreen} />
      <Stack.Screen name="PosturalMarking" component={PosturalMarkingScreen} />
      <Stack.Screen name="PosturalResult" component={PosturalResultScreen} />
    </Stack.Navigator>
  );
}

// Fluxo interno da aba de Avaliação Cervical (Início -> Câmera -> Marcação -> Resultado)
function CervicalStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CervicalHome" component={CervicalHomeScreen} />
      <Stack.Screen name="CervicalCapture" component={CervicalCaptureScreen} />
      <Stack.Screen name="CervicalMarking" component={CervicalMarkingScreen} />
      <Stack.Screen name="CervicalResult" component={CervicalResultScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E2E8F0' },
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tab.Screen name="Pacientes" component={PacientesStack} options={{ title: 'Histórico' }} />
      <Tab.Screen name="PosturalTab" component={PosturalStack} options={{ title: 'Postural' }} />
      <Tab.Screen name="CervicalTab" component={CervicalStack} options={{ title: 'Cervical' }} />
      <Tab.Screen name="NovaAvaliacaoTab" component={EvaluationStack} options={{ title: 'Marcha' }} />
    </Tab.Navigator>
  );
}
