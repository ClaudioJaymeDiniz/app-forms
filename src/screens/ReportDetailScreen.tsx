import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  Chip,
  ActivityIndicator,
  List,
  Divider
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

import { databaseService } from '../database/database';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Report, Project } from '../types';

type ReportDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ReportDetail'>;
type ReportDetailScreenRouteProp = RouteProp<RootStackParamList, 'ReportDetail'>;

const ReportDetailScreen: React.FC = () => {
  const navigation = useNavigation<ReportDetailScreenNavigationProp>();
  const route = useRoute<ReportDetailScreenRouteProp>();
  
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    loadReportDetails();
  }, []);

  const loadReportDetails = async () => {
    try {
      const reportData = await databaseService.getReportById(route.params.reportId);
      if (reportData) {
        setReport(reportData);
        
        // Carrega dados do projeto
        const projectData = await databaseService.getProjectsByUserId('current_user'); // TODO: usar ID real
        const reportProject = projectData.find(p => p.id === reportData.projectId);
        setProject(reportProject || null);
      }
    } catch (error) {
      console.error('Error loading report details:', error);
      Alert.alert('Erro', 'Falha ao carregar detalhes do relatório');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFillReport = () => {
    if (report) {
      navigation.navigate('FillReport', { reportId: report.id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#FF9800';
      case 'active': return '#4CAF50';
      case 'archived': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Rascunho';
      case 'active': return 'Ativo';
      case 'archived': return 'Arquivado';
      default: return 'Desconhecido';
    }
  };

  const getFieldTypeIcon = (type: string) => {
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

  const getFieldTypeName = (type: string) => {
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#F44336" />
        <Text style={styles.errorTitle}>Relatório não encontrado</Text>
        <Text style={styles.errorDescription}>
          O relatório solicitado não foi encontrado ou foi removido.
        </Text>
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
    <ScrollView style={styles.container}>
      {/* Informações básicas */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Title style={styles.title}>{report.title}</Title>
              <Chip 
                style={{ backgroundColor: getStatusColor(report.status) }}
                textStyle={{ color: '#fff' }}
              >
                {getStatusText(report.status)}
              </Chip>
            </View>
            
            {project && (
              <Text style={styles.projectName}>
                Projeto: {project.name}
              </Text>
            )}
            
            {report.description && (
              <Text style={styles.description}>{report.description}</Text>
            )}
          </View>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.metaText}>
                Criado em {new Date(report.createdAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={styles.metaText}>
                Atualizado em {new Date(report.updatedAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Ionicons name="list-outline" size={16} color="#666" />
              <Text style={styles.metaText}>
                {report.fields.length} campos
              </Text>
            </View>
          </View>

          {report.status === 'active' && (
            <Button
              mode="contained"
              onPress={navigateToFillReport}
              style={styles.fillButton}
              icon="edit"
            >
              Preencher Relatório
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Campos do relatório */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Campos do Relatório</Title>
          
          {report.fields.length === 0 ? (
            <Text style={styles.emptyText}>
              Nenhum campo configurado neste relatório.
            </Text>
          ) : (
            report.fields
              .sort((a, b) => a.order - b.order)
              .map((field, index) => (
                <View key={field.id}>
                  <List.Item
                    title={field.label}
                    description={`${getFieldTypeName(field.type)}${field.required ? ' (Obrigatório)' : ''}`}
                    left={props => (
                      <List.Icon 
                        {...props} 
                        icon={getFieldTypeIcon(field.type)}
                        color="#2196F3"
                      />
                    )}
                    right={props => (
                      field.required ? (
                        <Chip style={styles.requiredChip} textStyle={{ color: '#fff' }}>
                          Obrigatório
                        </Chip>
                      ) : null
                    )}
                  />
                  {index < report.fields.length - 1 && <Divider />}
                </View>
              ))
          )}
        </Card.Content>
      </Card>

      {/* Ações */}
      {state.user && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Ações</Title>
            
            {/* Botão para preencher relatório */}
            {(report.permissions.canFill.includes('*') || 
              report.permissions.canFill.includes(state.user.email)) && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate('FillReport', { reportId: report.id })}
                style={styles.actionButton}
                icon="edit"
              >
                Preencher Relatório
              </Button>
            )}

            {/* Botão para ver respostas (apenas para o criador) */}
            {state.user.id === report.createdBy && (
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('ReportResponses', { reportId: report.id })}
                style={styles.actionButton}
                icon="eye"
              >
                Ver Respostas
              </Button>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Permissões */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Permissões</Title>
          
          <List.Item
            title="Pode preencher"
            description={`${report.permissions.canFill.length} usuário(s)`}
            left={props => <List.Icon {...props} icon="edit" />}
          />
          <Divider />
          
          <List.Item
            title="Pode editar"
            description={`${report.permissions.canEdit.length} usuário(s)`}
            left={props => <List.Icon {...props} icon="pencil" />}
          />
          <Divider />
          
          <List.Item
            title="Pode visualizar"
            description={`${report.permissions.canView.length} usuário(s)`}
            left={props => <List.Icon {...props} icon="eye" />}
          />
          <Divider />
          
          <List.Item
            title="Pode consolidar"
            description={`${report.permissions.canConsolidate.length} usuário(s)`}
            left={props => <List.Icon {...props} icon="chart-line" />}
          />
        </Card.Content>
      </Card>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    marginBottom: 10,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  backButton: {
    paddingHorizontal: 20,
  },
  card: {
    margin: 20,
    marginBottom: 16,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 16,
  },
  projectName: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginBottom: 8,
  },
  description: {
    color: '#666',
    lineHeight: 20,
  },
  metaInfo: {
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  fillButton: {
    marginTop: 8,
    paddingVertical: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    marginTop: 16,
  },
  requiredChip: {
    backgroundColor: '#F44336',
  },
  actionButton: {
    marginBottom: 8,
  },
  bottomSpacing: {
    height: 100,
  },
});

export default ReportDetailScreen;

