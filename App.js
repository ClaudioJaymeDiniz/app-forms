import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Alert } from 'react-native';
import { Provider as PaperProvider, DefaultTheme, ActivityIndicator, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/contexts/AuthContext';
import { databaseService } from './src/database/database';
import { syncService } from './src/services/syncService';
import AppNavigator from './src/navigation/AppNavigator';

// Tema personalizado para o React Native Paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2196F3',
    accent: '#FFC107',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    placeholder: '#999999',
  },
};

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('Initializing Reports App...');
      
      // Inicializa o banco de dados
      await databaseService.init();
      console.log('Database initialized successfully');
      
      // Inicializa o serviço de sincronização
      // O syncService já se inicializa automaticamente no construtor
      console.log('Sync service initialized');
      
      setIsInitialized(true);
      console.log('App initialization completed');
      
    } catch (error) {
      console.error('App initialization failed:', error);
      setInitError(error.message || 'Falha na inicialização do aplicativo');
      
      // Mostra alerta de erro
      Alert.alert(
        'Erro de Inicialização',
        'Falha ao inicializar o aplicativo. Tente reiniciar.',
        [
          {
            text: 'Tentar Novamente',
            onPress: () => {
              setInitError(null);
              initializeApp();
            }
          }
        ]
      );
    }
  };

  // Tela de carregamento durante a inicialização
  if (!isInitialized) {
    return (
      <PaperProvider theme={theme}>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {initError ? 'Erro na inicialização' : 'Inicializando Reports App...'}
            </Text>
            {initError && (
              <Text style={styles.errorText}>{initError}</Text>
            )}
          </View>
          <StatusBar style="auto" />
        </SafeAreaProvider>
      </PaperProvider>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
});
