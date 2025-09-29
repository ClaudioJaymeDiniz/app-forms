import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { 
  Text, 
  Card, 
  Title, 
  Button, 
  FAB,
  Surface,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../database/database';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Project } from '../types';

type ProjectsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ProjectsScreen: React.FC = () => {
  const navigation = useNavigation<ProjectsScreenNavigationProp>();
  const { state } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadProjects();
    }, [])
  );

  const loadProjects = async () => {
    try {
      if (!state.user) return;

      const userProjects = await databaseService.getProjectsByUserId(state.user.id);
      setProjects(userProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  const navigateToCreateProject = () => {
    navigation.navigate('CreateProject');
  };

  const navigateToCreateReport = (projectId: string) => {
    navigation.navigate('CreateReport', { projectId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando projetos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {projects.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>Nenhum projeto encontrado</Text>
            <Text style={styles.emptyDescription}>
              Crie seu primeiro projeto para começar a organizar seus relatórios
            </Text>
            <Button
              mode="contained"
              onPress={navigateToCreateProject}
              style={styles.createButton}
              icon="folder-plus"
            >
              Criar Primeiro Projeto
            </Button>
          </View>
        ) : (
          <View style={styles.projectsList}>
            {projects.map((project) => (
              <Card key={project.id} style={styles.projectCard}>
                <Card.Content>
                  <View style={styles.projectHeader}>
                    <View style={styles.projectInfo}>
                      <Title style={styles.projectTitle}>{project.name}</Title>
                      <Text style={styles.projectDescription} numberOfLines={2}>
                        {project.description || 'Sem descrição'}
                      </Text>
                    </View>
                    <View 
                      style={[
                        styles.colorIndicator, 
                        { backgroundColor: project.settings.primaryColor }
                      ]} 
                    />
                  </View>

                  <View style={styles.projectMeta}>
                    <Chip icon="calendar" style={styles.metaChip}>
                      {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                    </Chip>
                    <Chip icon="account" style={styles.metaChip}>
                      Proprietário
                    </Chip>
                  </View>

                  <View style={styles.projectActions}>
                    <Button
                      mode="outlined"
                      onPress={() => navigateToCreateReport(project.id)}
                      style={styles.actionButton}
                      icon="document"
                    >
                      Novo Relatório
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => {/* TODO: Ver relatórios do projeto */}}
                      style={styles.actionButton}
                    >
                      Ver Relatórios
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={navigateToCreateProject}
        label="Novo Projeto"
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  createButton: {
    paddingHorizontal: 20,
  },
  projectsList: {
    padding: 20,
  },
  projectCard: {
    marginBottom: 16,
    elevation: 2,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  projectInfo: {
    flex: 1,
    marginRight: 16,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  projectDescription: {
    color: '#666',
    lineHeight: 20,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    elevation: 2,
  },
  projectMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaChip: {
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  projectActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  bottomSpacing: {
    height: 80,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2196F3',
  },
});

export default ProjectsScreen;

