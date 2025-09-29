import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Card, 
  Title,
  ActivityIndicator,
  Menu,
  Divider,
  List,
  FAB
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../database/database';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Project, ReportField } from '../types';

type CreateReportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateReport'>;
type CreateReportScreenRouteProp = RouteProp<RootStackParamList, 'CreateReport'>;

const CreateReportScreen: React.FC = () => {
  const navigation = useNavigation<CreateReportScreenNavigationProp>();
  const route = useRoute<CreateReportScreenRouteProp>();
  const { state } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fields, setFields] = useState<ReportField[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectMenuVisible, setProjectMenuVisible] = useState(false);
  const [accessType, setAccessType] = useState<'public' | 'specific'>('public');
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    loadProjects();
  }, [state.user]);

  const loadProjects = async () => {
    try {
      if (!state.user) return;

      const userProjects = await databaseService.getProjectsByUserId(state.user.id);
      setProjects(userProjects);

      // Se foi passado um projectId na rota, seleciona automaticamente
      if (route.params?.projectId) {
        const project = userProjects.find(p => p.id === route.params.projectId);
        if (project) {
          setSelectedProject(project);
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleAddUser = () => {
    if (!newUserEmail.trim()) {
      Alert.alert('Erro', 'Por favor, informe um email válido');
      return;
    }

    const email = newUserEmail.trim().toLowerCase();
    
    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Erro', 'Por favor, informe um email válido');
      return;
    }

    if (allowedUsers.includes(email)) {
      Alert.alert('Erro', 'Este usuário já foi adicionado');
      return;
    }

    setAllowedUsers(prev => [...prev, email]);
    setNewUserEmail('');
  };

  const handleRemoveUser = (index: number) => {
    setAllowedUsers(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Erro', 'Por favor, informe o título do relatório');
      return false;
    }

    if (!selectedProject) {
      Alert.alert('Erro', 'Por favor, selecione um projeto');
      return false;
    }

    if (fields.length === 0) {
      Alert.alert('Erro', 'Por favor, adicione pelo menos um campo ao relatório');
      return false;
    }

    if (accessType === 'specific' && allowedUsers.length === 0) {
      Alert.alert('Erro', 'Por favor, adicione pelo menos um usuário com permissão para preencher o relatório');
      return false;
    }

    return true;
  };

  const handleCreateReport = async () => {
    if (!validateForm() || !state.user || !selectedProject) {
      return;
    }

    setLoading(true);
    try {
      // Configurar permissões baseadas no tipo de acesso
      const permissions = {
        canFill: accessType === 'public' ? ['*'] : allowedUsers,
        canEdit: [state.user.id], // Apenas o criador pode editar
        canView: accessType === 'public' ? ['*'] : [...allowedUsers, state.user.id],
        canConsolidate: [state.user.id] // Apenas o criador pode consolidar
      };

      console.log('Creating report with data:', {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: selectedProject.id,
        createdBy: state.user.id,
        fields: fields.map((field, index) => ({
          ...field,
          order: index
        })),
        permissions,
        status: 'active'
      });

      await databaseService.createReport({
        title: title.trim(),
        description: description.trim() || undefined,
        projectId: selectedProject.id,
        createdBy: state.user.id,
        fields: fields.map((field, index) => ({
          ...field,
          order: index
        })),
        permissions,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      Alert.alert(
        'Sucesso',
        'Relatório criado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating report:', error);
      Alert.alert('Erro', `Falha ao criar relatório: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const addField = (type: ReportField['type']) => {
    const newField: ReportField = {
      id: Date.now().toString(),
      type,
      label: `Campo ${fields.length + 1}`,
      required: false,
      order: fields.length,
      ...(type === 'select' && { options: ['Opção 1'] }) // Inicializa com uma opção padrão para select
    };

    setFields([...fields, newField]);
  };

  const updateField = (fieldId: string, updates: Partial<ReportField>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
  };

  const getFieldTypeIcon = (type: ReportField['type']) => {
    switch (type) {
      case 'text': return 'text';
      case 'textarea': return 'text-long';
      case 'checkbox': return 'checkbox-marked';
      case 'select': return 'menu-down';
      case 'file': return 'file';
      case 'image': return 'image';
      default: return 'help';
    }
  };

  const getFieldTypeName = (type: ReportField['type']) => {
    switch (type) {
      case 'text': return 'Texto';
      case 'textarea': return 'Texto longo';
      case 'checkbox': return 'Checkbox';
      case 'select': return 'Lista suspensa';
      case 'file': return 'Arquivo';
      case 'image': return 'Imagem';
      default: return 'Desconhecido';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Novo Relatório</Title>
            <Text style={styles.subtitle}>
              Configure os campos e permissões do seu relatório
            </Text>

            {/* Seleção de projeto */}
            <Text style={styles.sectionTitle}>Projeto</Text>
            <Menu
              visible={projectMenuVisible}
              onDismiss={() => setProjectMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setProjectMenuVisible(true)}
                  style={styles.projectSelector}
                  icon="folder"
                >
                  {selectedProject ? selectedProject.name : 'Selecionar projeto'}
                </Button>
              }
            >
              {projects.map((project) => (
                <Menu.Item
                  key={project.id}
                  onPress={() => {
                    setSelectedProject(project);
                    setProjectMenuVisible(false);
                  }}
                  title={project.name}
                />
              ))}
            </Menu>

            {/* Informações básicas */}
            <Text style={styles.sectionTitle}>Informações Básicas</Text>
            
            <TextInput
              label="Título do relatório *"
              value={title}
              onChangeText={setTitle}
              mode="outlined"
              style={styles.input}
              placeholder="Ex: Relatório de Vendas Mensal"
            />

            <TextInput
              label="Descrição"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
              placeholder="Descreva o objetivo do relatório..."
            />

            {/* Campos do relatório */}
            <Text style={styles.sectionTitle}>Campos do Relatório</Text>
            
            {fields.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum campo adicionado. Use o botão + para adicionar campos.
              </Text>
            ) : (
              fields.map((field, index) => (
                <Card key={field.id} style={styles.fieldCard}>
                  <Card.Content>
                    <View style={styles.fieldHeader}>
                      <View style={styles.fieldInfo}>
                        <Ionicons 
                          name={getFieldTypeIcon(field.type)} 
                          size={20} 
                          color="#2196F3" 
                        />
                        <Text style={styles.fieldType}>
                          {getFieldTypeName(field.type)}
                        </Text>
                      </View>
                      <Button
                        mode="text"
                        onPress={() => removeField(field.id)}
                        compact
                        textColor="#F44336"
                      >
                        Remover
                      </Button>
                    </View>

                    <TextInput
                      label="Rótulo do campo"
                      value={field.label}
                      onChangeText={(text) => updateField(field.id, { label: text })}
                      mode="outlined"
                      style={styles.fieldInput}
                    />

                    <TextInput
                      label="Placeholder (opcional)"
                      value={field.placeholder || ''}
                      onChangeText={(text) => updateField(field.id, { placeholder: text })}
                      mode="outlined"
                      style={styles.fieldInput}
                    />

                    {/* Opções para lista suspensa */}
                    {field.type === 'select' && (
                      <View style={styles.selectOptionsContainer}>
                        <Text style={styles.selectOptionsTitle}>Opções da Lista:</Text>
                        {(field.options || []).map((option, optionIndex) => (
                          <View key={optionIndex} style={styles.selectOptionItem}>
                            <TextInput
                              value={option}
                              onChangeText={(text) => {
                                const newOptions = [...(field.options || [])];
                                newOptions[optionIndex] = text;
                                updateField(field.id, { options: newOptions });
                              }}
                              mode="outlined"
                              style={styles.selectOptionInput}
                              placeholder={`Opção ${optionIndex + 1}`}
                            />
                            <Button
                              mode="text"
                              onPress={() => {
                                const newOptions = [...(field.options || [])];
                                newOptions.splice(optionIndex, 1);
                                updateField(field.id, { options: newOptions });
                              }}
                              compact
                              textColor="#F44336"
                            >
                              Remover
                            </Button>
                          </View>
                        ))}
                        <Button
                          mode="outlined"
                          onPress={() => {
                            const newOptions = [...(field.options || []), ''];
                            updateField(field.id, { options: newOptions });
                          }}
                          style={styles.addOptionButton}
                          icon="plus"
                        >
                          Adicionar Opção
                        </Button>
                      </View>
                    )}

                    <View style={styles.fieldOptions}>
                      <Button
                        mode={field.required ? "contained" : "outlined"}
                        onPress={() => updateField(field.id, { required: !field.required })}
                        compact
                        style={styles.optionButton}
                      >
                        {field.required ? "Obrigatório" : "Opcional"}
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}

            {/* Permissões de Acesso */}
            <Card style={styles.card}>
              <Card.Content>
                <Title>Permissões de Acesso</Title>
                
                <View style={styles.permissionSection}>
                  <Text style={styles.permissionLabel}>Quem pode preencher este relatório?</Text>
                  
                  <View style={styles.permissionOptions}>
                    <Button
                      mode={accessType === 'public' ? "contained" : "outlined"}
                      onPress={() => setAccessType('public')}
                      style={styles.permissionButton}
                      icon="earth"
                    >
                      Público (Qualquer usuário)
                    </Button>
                    
                    <Button
                      mode={accessType === 'specific' ? "contained" : "outlined"}
                      onPress={() => setAccessType('specific')}
                      style={styles.permissionButton}
                      icon="account-group"
                    >
                      Usuários Específicos
                    </Button>
                  </View>

                  {accessType === 'specific' && (
                    <View style={styles.specificUsersSection}>
                      <Text style={styles.specificUsersLabel}>Adicionar usuários:</Text>
                      
                      <View style={styles.addUserRow}>
                        <TextInput
                          label="Email do usuário"
                          value={newUserEmail}
                          onChangeText={setNewUserEmail}
                          mode="outlined"
                          style={styles.userEmailInput}
                          placeholder="usuario@exemplo.com"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                        <Button
                          mode="contained"
                          onPress={handleAddUser}
                          style={styles.addUserButton}
                          icon="plus"
                          compact
                        >
                          Adicionar
                        </Button>
                      </View>

                      {allowedUsers.length > 0 && (
                        <View style={styles.usersList}>
                          <Text style={styles.usersListTitle}>Usuários com acesso:</Text>
                          {allowedUsers.map((email, index) => (
                            <View key={index} style={styles.userItem}>
                              <Text style={styles.userEmail}>{email}</Text>
                              <Button
                                mode="text"
                                onPress={() => handleRemoveUser(index)}
                                compact
                                textColor="#F44336"
                              >
                                Remover
                              </Button>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.permissionInfo}>
                    <Text style={styles.permissionInfoText}>
                      {accessType === 'public' 
                        ? "ℹ️ Qualquer usuário logado poderá preencher este relatório"
                        : "ℹ️ Apenas os usuários listados acima poderão preencher este relatório"
                      }
                    </Text>
                  </View>
                </View>
              </Card.Content>
            </Card>

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
                onPress={handleCreateReport}
                style={styles.button}
                loading={loading}
                disabled={loading}
              >
                Criar Relatório
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Menu de adicionar campos */}
      <Menu
        visible={false}
        onDismiss={() => {}}
        anchor={
          <FAB
            style={styles.fab}
            icon="plus"
            label="Adicionar Campo"
            onPress={() => {
              Alert.alert(
                'Adicionar Campo',
                'Selecione o tipo de campo:',
                [
                  { text: 'Texto', onPress: () => addField('text') },
                  { text: 'Texto longo', onPress: () => addField('textarea') },
                  { text: 'Checkbox', onPress: () => addField('checkbox') },
                  { text: 'Lista suspensa', onPress: () => addField('select') },
                  { text: 'Arquivo', onPress: () => addField('file') },
                  { text: 'Imagem', onPress: () => addField('image') },
                  { text: 'Cancelar', style: 'cancel' }
                ]
              );
            }}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  projectSelector: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginVertical: 20,
  },
  fieldCard: {
    marginBottom: 12,
    elevation: 1,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldType: {
    marginLeft: 8,
    fontWeight: 'bold',
    color: '#333',
  },
  fieldInput: {
    marginBottom: 8,
  },
  fieldOptions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  optionButton: {
    marginHorizontal: 4,
  },
  selectOptionsContainer: {
    marginTop: 16,
    marginBottom: 16,
  },
  selectOptionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  selectOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectOptionInput: {
    flex: 1,
    marginRight: 8,
  },
  addOptionButton: {
    marginTop: 8,
  },
  permissionSection: {
    marginTop: 16,
  },
  permissionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  permissionOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  permissionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  specificUsersSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  specificUsersLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  addUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userEmailInput: {
    flex: 1,
    marginRight: 8,
  },
  addUserButton: {
    paddingHorizontal: 16,
  },
  usersList: {
    marginTop: 16,
  },
  usersListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#333',
  },
  permissionInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 6,
  },
  permissionInfoText: {
    fontSize: 12,
    color: '#1976d2',
    lineHeight: 16,
  },
  bottomSpacing: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default CreateReportScreen;

