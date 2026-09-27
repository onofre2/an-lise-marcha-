import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/database';
import { PacienteAtivoProvider } from './src/context/PacienteAtivoContext';
import { TemaProvider } from './src/context/TemaContext';
import { IdiomaProvider } from './src/context/IdiomaContext';

export default function App() {
  useEffect(() => {
    // Inicializa o banco de dados local assim que o app abre
    initDatabase();
  }, []);

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <IdiomaProvider>
        <PacienteAtivoProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <AppNavigator />
        </NavigationContainer>
        </PacienteAtivoProvider>
        </IdiomaProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
