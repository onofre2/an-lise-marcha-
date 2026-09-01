import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/services/database';
import { PacienteAtivoProvider } from './src/context/PacienteAtivoContext';

export default function App() {
  useEffect(() => {
    // Inicializa o banco de dados local assim que o app abre
    initDatabase();
  }, []);

  return (
    <PacienteAtivoProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </PacienteAtivoProvider>
  );
}
