import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import EvaluationScreen from '../screens/EvaluationScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import VideoEditScreen from '../screens/VideoEditScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Fluxo interno da aba de Avaliação (Avaliação -> Câmera -> Edição)
function EvaluationStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="EvaluationHome" component={EvaluationScreen} />
      <Stack.Screen name="CameraCapture" component={CameraCaptureScreen} />
      <Stack.Screen name="VideoEdit" component={VideoEditScreen} />
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
      <Tab.Screen 
        name="Pacientes" 
        component={HomeScreen} 
        options={{ title: 'Histórico' }}
      />
      <Tab.Screen 
        name="NovaAvaliacaoTab" 
        component={EvaluationStack} 
        options={{ title: 'Nova Avaliação' }}
      />
    </Tab.Navigator>
  );
}
