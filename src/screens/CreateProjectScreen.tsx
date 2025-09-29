import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Card, 
  Title,
  ActivityIndicator
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../database/database';
import { RootStackParamList } from '../navigation/AppNavigator';

type CreateProjectScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateProject'>;

const CreateProjectScreen: React.FC = () => {
  const navigation = useNavigation<CreateProjectScreenNavigationProp>();
  const { state } = useAuth();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2196F3');
  const [secondaryColor, setSecondaryColor] = useState('#FFC107');
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert('Erro', 'Por favor, informe o nome do projeto');
      return false;
    }
    return true;
  };

  const handleCreateProject = async () => {
    if (!validateForm() || !state.user) {
      return;
    }

    setLoading(true);
    try {
      await databaseService.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        ownerId: state.user.id,
        settings: {
          primaryColor,
          secondaryColor,
          allowOffline: true
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      Alert.alert(
        'Sucesso',
        'Projeto criado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Erro', 'Falha ao criar projeto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Novo Projeto</Title>
          <Text style={styles.subtitle}>
            Crie um novo projeto para organizar seus relatórios
          </Text>

          <TextInput
            label="Nome do projeto *"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            placeholder="Ex: Relatórios de Vendas Q1"
          />

          <TextInput
            label="Descrição"
            value={description}
            onChangeText={setDescription}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder="Descreva o objetivo e escopo do projeto..."
          />

          <Text style={styles.sectionTitle}>Personalização</Text>
          
          <TextInput
            label="Cor primária (hex)"
            value={primaryColor}
            onChangeText={setPrimaryColor}
            mode="outlined"
            style={styles.input}
            placeholder="#2196F3"
          />
          
          <TextInput
            label="Cor secundária (hex)"
            value={secondaryColor}
            onChangeText={setSecondaryColor}
            mode="outlined"
            style={styles.input}
            placeholder="#FFC107"
          />

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}
              disabled={loading}
            >
              Cancelar
            </Button>
            
            <Button
              mode="contained"
              onPress={handleCreateProject}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Criar Projeto
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  card: {
    elevation: 4,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
});

export default CreateProjectScreen;

