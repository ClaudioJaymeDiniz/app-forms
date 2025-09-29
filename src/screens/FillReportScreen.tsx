import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  TextInput,
  Checkbox,
  ActivityIndicator,
  Menu,
  Chip
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../database/database';
import { syncService } from '../services/syncService';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Report, ReportSubmission, ReportField } from '../types';

type FillReportScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FillReport'>;
type FillReportScreenRouteProp = RouteProp<RootStackParamList, 'FillReport'>;

const FillReportScreen: React.FC = () => {
  const navigation = useNavigation<FillReportScreenNavigationProp>();
  const route = useRoute<FillReportScreenRouteProp>();
  const { state } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [submission, setSubmission] = useState<ReportSubmission | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [menuVisible, setMenuVisible] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadReportAndSubmission();
  }, []);

  // Auto-save a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (report && state.user && Object.keys(formData).length > 0) {
        autoSave();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, report, state.user]);

  const loadReportAndSubmission = async () => {
    try {
      const reportData = await databaseService.getReportById(route.params.reportId);
      if (!reportData) {
        Alert.alert('Erro', 'Relatório não encontrado');
        navigation.goBack();
        return;
      }

      setReport(reportData);

      // Se foi passado um submissionId, carrega a submissão existente
      if (route.params.submissionId) {
        // TODO: Implementar busca de submissão por ID
        // const submissionData = await databaseService.getSubmissionById(route.params.submissionId);
        // if (submissionData) {
        //   setSubmission(submissionData);
        //   setFormData(submissionData.data);
        // }
      } else {
        // Verifica se já existe uma submissão em rascunho para este usuário
        if (state.user) {
          const userSubmissions = await databaseService.getSubmissionsByUserId(state.user.id);
          const draftSubmission = userSubmissions.find(
            s => s.reportId === reportData.id && s.status === 'draft'
          );
          
          if (draftSubmission) {
            setSubmission(draftSubmission);
            setFormData(draftSubmission.data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading report and submission:', error);
      Alert.alert('Erro', 'Falha ao carregar relatório');
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async () => {
    if (!report || !state.user) return;

    try {
      if (submission) {
        // Atualiza submissão existente
        await syncService.updateSubmissionOffline(submission.id, formData);
      } else {
        // Cria nova submissão
        const submissionId = await syncService.saveSubmissionOffline(
          report.id,
          state.user.id,
          formData,
          'draft'
        );
        
        // Carrega a submissão criada
        const newSubmission = await databaseService.getSubmissionsByUserId(state.user.id);
        const createdSubmission = newSubmission.find(s => s.id === submissionId);
        if (createdSubmission) {
          setSubmission(createdSubmission);
        }
      }
    } catch (error) {
      console.error('Auto-save error:', error);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateForm = () => {
    if (!report) return false;

    const requiredFields = report.fields.filter(field => field.required);
    
    for (const field of requiredFields) {
      const value = formData[field.id];
      
      if (value === undefined || value === null || value === '') {
        Alert.alert('Erro', `O campo "${field.label}" é obrigatório`);
        return false;
      }
      
      if (field.type === 'checkbox' && !value) {
        Alert.alert('Erro', `O campo "${field.label}" é obrigatório`);
        return false;
      }
    }
    
    return true;
  };

  const handleSaveDraft = async () => {
    if (!report || !state.user) return;

    setSaving(true);
    try {
      await autoSave();
      Alert.alert('Sucesso', 'Rascunho salvo com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Falha ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm() || !report || !state.user) return;

    setSaving(true);
    try {
      if (submission) {
        // Atualiza submissão existente para 'submitted'
        await syncService.updateSubmissionOffline(submission.id, formData, 'submitted');
      } else {
        // Cria nova submissão como 'submitted'
        await syncService.saveSubmissionOffline(
          report.id,
          state.user.id,
          formData,
          'submitted'
        );
      }

      Alert.alert(
        'Sucesso',
        'Relatório enviado com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Falha ao enviar relatório');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field: ReportField) => {
    const value = formData[field.id];

    switch (field.type) {
      case 'text':
        return (
          <TextInput
            key={field.id}
            label={field.label + (field.required ? ' *' : '')}
            value={value || ''}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            mode="outlined"
            style={styles.input}
            placeholder={field.placeholder}
          />
        );

      case 'textarea':
        return (
          <TextInput
            key={field.id}
            label={field.label + (field.required ? ' *' : '')}
            value={value || ''}
            onChangeText={(text) => handleFieldChange(field.id, text)}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholder={field.placeholder}
          />
        );

      case 'checkbox':
        return (
          <View key={field.id} style={styles.checkboxContainer}>
            <Checkbox
              status={value ? 'checked' : 'unchecked'}
              onPress={() => handleFieldChange(field.id, !value)}
            />
            <Text style={styles.checkboxLabel}>
              {field.label + (field.required ? ' *' : '')}
            </Text>
          </View>
        );

      case 'select':
        return (
          <View key={field.id} style={styles.selectContainer}>
            <Text style={styles.selectLabel}>
              {field.label + (field.required ? ' *' : '')}
            </Text>
            <Menu
              visible={menuVisible[field.id] || false}
              onDismiss={() => setMenuVisible(prev => ({ ...prev, [field.id]: false }))}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(prev => ({ ...prev, [field.id]: true }))}
                  style={styles.selectButton}
                >
                  {value || field.placeholder || 'Selecionar...'}
                </Button>
              }
            >
              {field.options?.map((option) => (
                <Menu.Item
                  key={option}
                  onPress={() => {
                    handleFieldChange(field.id, option);
                    setMenuVisible(prev => ({ ...prev, [field.id]: false }));
                  }}
                  title={option}
                />
              ))}
            </Menu>
          </View>
        );

      case 'file':
      case 'image':
        return (
          <View key={field.id} style={styles.fileContainer}>
            <Text style={styles.fileLabel}>
              {field.label + (field.required ? ' *' : '')}
            </Text>
            <Button
              mode="outlined"
              onPress={() => Alert.alert('Em breve', 'Funcionalidade de upload em desenvolvimento')}
              style={styles.fileButton}
              icon={field.type === 'image' ? 'image' : 'file'}
            >
              {value ? 'Arquivo selecionado' : 'Selecionar arquivo'}
            </Button>
            {value && (
              <Chip
                onClose={() => handleFieldChange(field.id, null)}
                style={styles.fileChip}
              >
                {value}
              </Chip>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando relatório...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#F44336" />
        <Text style={styles.errorTitle}>Relatório não encontrado</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>{report.title}</Title>
            {report.description && (
              <Text style={styles.description}>{report.description}</Text>
            )}
            
            {submission && (
              <Chip 
                icon="auto-fix" 
                style={styles.statusChip}
                textStyle={{ color: '#fff' }}
              >
                {submission.status === 'draft' ? 'Rascunho salvo' : 'Enviado'}
              </Chip>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Title>Preencher Campos</Title>
            
            {report.fields
              .sort((a, b) => a.order - b.order)
              .map(field => renderField(field))
            }
          </Card.Content>
        </Card>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={handleSaveDraft}
          style={styles.actionButton}
          loading={saving}
          disabled={saving}
          icon="content-save"
        >
          Salvar Rascunho
        </Button>
        
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.actionButton}
          loading={saving}
          disabled={saving}
          icon="send"
        >
          Enviar
        </Button>
      </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 20,
    marginBottom: 30,
  },
  backButton: {
    paddingHorizontal: 20,
  },
  card: {
    margin: 20,
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
  },
  statusChip: {
    backgroundColor: '#4CAF50',
    alignSelf: 'flex-start',
  },
  input: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  selectContainer: {
    marginBottom: 16,
  },
  selectLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  selectButton: {
    justifyContent: 'flex-start',
  },
  fileContainer: {
    marginBottom: 16,
  },
  fileLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  fileButton: {
    justifyContent: 'flex-start',
    marginBottom: 8,
  },
  fileChip: {
    alignSelf: 'flex-start',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#fff',
    elevation: 4,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
  },
  bottomSpacing: {
    height: 20,
  },
});

export default FillReportScreen;

