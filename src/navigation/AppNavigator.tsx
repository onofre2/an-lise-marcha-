import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
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
import ADMHomeScreen from '../screens/adm/ADMHomeScreen';
import ADMCaptureScreen from '../screens/adm/ADMCaptureScreen';
import ADMMarkingScreen from '../screens/adm/ADMMarkingScreen';
import ADMResultScreen from '../screens/adm/ADMResultScreen';
import ConfiguracoesScreen from '../screens/configuracoes/ConfiguracoesScreen';

const Tab = createMaterialTopTabNavigator();
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

// Fluxo interno da aba de Amplitude de Movimento
function ADMStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ADMHome" component={ADMHomeScreen} />
      <Stack.Screen name="ADMCapture" component={ADMCaptureScreen} />
      <Stack.Screen name="ADMMarking" component={ADMMarkingScreen} />
      <Stack.Screen name="ADMResult" component={ADMResultScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      screenOptions={{
        swipeEnabled: true,
        tabBarShowIcon: true,
        tabBarShowLabel: true,
        tabBarIndicatorStyle: { height: 0 },
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', elevation: 0, shadowOpacity: 0, height: 56 + insets.bottom, paddingBottom: insets.bottom, paddingTop: 6 },
        tabBarActiveTintColor: '#0284C7',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarLabelStyle: { fontSize: 11, textTransform: 'none', margin: 0 },
        tabBarItemStyle: { padding: 0 },
      }}
    >
      <Tab.Screen name="Pacientes" component={PacientesStack} options={{ title: 'Histórico', tabBarIcon: ({ color }) => <Ionicons name="people" size={22} color={color} /> }} />
      <Tab.Screen name="PosturalTab" component={PosturalStack} options={{ title: 'Postural', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="human-handsdown" size={22} color={color} /> }} />
      <Tab.Screen name="CervicalTab" component={CervicalStack} options={{ title: 'Cervical', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="human" size={22} color={color} /> }} />
      <Tab.Screen name="ADMTab" component={ADMStack} options={{ title: 'ADM', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="angle-acute" size={22} color={color} /> }} />
      <Tab.Screen name="NovaAvaliacaoTab" component={EvaluationStack} options={{ title: 'Marcha', tabBarIcon: ({ color }) => <MaterialCommunityIcons name="walk" size={22} color={color} /> }} />
      <Tab.Screen name="ConfiguracoesTab" component={ConfiguracoesScreen} options={{ title: 'Config', tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={22} color={color} /> }} />
    </Tab.Navigator>
  );
}
