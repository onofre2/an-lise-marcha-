import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import EvaluationScreen from '../screens/EvaluationScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import VideoEditScreen from '../screens/VideoEditScreen';
import PosturalHomeScreen from '../screens/postural/PosturalHomeScreen';
import PosturalCaptureScreen from '../screens/postural/PosturalCaptureScreen';
import PosturalMarkingScreen from '../screens/postural/PosturalMarkingScreen';
import PosturalResultScreen from '../screens/postural/PosturalResultScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Fluxo interno da aba de Avaliação de Marcha (Avaliação -> Câmera -> Edição)
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

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1E293B' },
        headerTintColor: '#F8FAFC',
        tabBarStyle: { backgroundColor: '#1E293B', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#38BDF8',
        tabBarInactiveTintColor: '#94A3B8',
      }}
    >
      <Tab.Screen name="Pacientes" component={HomeScreen} options={{ title: 'Histórico' }} />
      <Tab.Screen name="PosturalTab" component={PosturalStack} options={{ title: 'Postural' }} />
      <Tab.Screen name="NovaAvaliacaoTab" component={EvaluationStack} options={{ title: 'Marcha' }} />
    </Tab.Navigator>
  );
}
