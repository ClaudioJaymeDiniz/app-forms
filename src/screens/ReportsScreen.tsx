import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { 
  Text, 
  Card, 
  Button, 
  FAB,
  ActivityIndicator,
  Chip,
  Searchbar
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { useAuth } from '../contexts/AuthContext';
import { databaseService } from '../database/database';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Report, Project } from '../types';
import { exportReportsToCSV } from '../utils/exportUtils';

type ReportsScreenNavigationProp = StackNavigationProp<RootStackParamList>;

const ReportsScreen: React.FC = () => {
  const navigation = useNavigation<ReportsScreenNavigationProp>();
  const { state } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadReports();
    }, [])
  );

  useEffect(() => {
    filterReports();
  }, [searchQuery, reports, selectedStatuses, selectedProjectId]);

  const loadReports = async () => {
    try {
      if (!state.user) return;

      // Carrega projetos do usuário
      const userProjects = await databaseService.getProjectsByUserId(state.user.id);
      setProjects(userProjects);

      // Carrega todos os relatórios dos projetos do usuário
      const ownedReports: Report[] = [];
      for (const project of userProjects) {
        const projectReports = await databaseService.getReportsByProjectId(project.id);
        ownedReports.push(...projectReports);
      }

      // Carrega todos os relatórios onde o usuário tem permissão para preencher
      const allReports = await databaseService.getAllReports();
      const accessibleReports = allReports.filter(report => {
        // Inclui se o usuário é o criador
        if (report.createdBy === state.user.id) return true;
        
        // Inclui se o relatório é público
        if (report.permissions.canFill.includes('*')) return true;
        
        // Inclui se o usuário está na lista de permissões
        if (report.permissions.canFill.includes(state.user.email)) return true;
        
        return false;
      });
      
      // Remove duplicatas e ordena por data de criação (mais recentes primeiro)
      const uniqueReports = Array.from(
        new Map(accessibleReports.map(report => [report.id, report])).values()
      );
      
      const sortedReports = uniqueReports.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setReports(sortedReports);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterReports = () => {
    const text = searchQuery.trim().toLowerCase();
    const filtered = reports.filter((report) => {
      const matchesSearch = !text ||
        report.title.toLowerCase().includes(text) ||
        (report.description && report.description.toLowerCase().includes(text));
      const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(report.status);
      const matchesProject = !selectedProjectId || report.projectId === selectedProjectId;
      return matchesSearch && matchesStatus && matchesProject;
    });
    setFilteredReports(filtered);
  };

  const toggleStatus = (status: 'draft' | 'active' | 'archived') => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const selectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedStatuses([]);
    setSelectedProjectId(null);
  };

  const handleExportReportsCSV = async () => {
    try {
      if (!filteredReports || filteredReports.length === 0) {
        Alert.alert('Sem dados', 'Não há relatórios filtrados para exportar.');
        return;
      }
      const base = 'relatorios';
      const projectSlug = selectedProjectId
        ? (getProjectName(selectedProjectId) || 'projeto')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/--+/g, '-')
        : '';
      const statusSlug = selectedStatuses.length > 0
        ? selectedStatuses.join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '-')
        : '';
      const q = searchQuery.trim();
      const querySlug = q
        ? q
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/--+/g, '-')
            .slice(0, 40)
        : '';

      const parts = [base, projectSlug, statusSlug, querySlug].filter(Boolean);
      const fileName = `${parts.join('-') || base}.csv`;
      const path = await exportReportsToCSV(filteredReports, fileName);
      Alert.alert('Exportação concluída', `Arquivo salvo: ${path}`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao exportar CSV de relatórios');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const navigateToCreateReport = () => {
    navigation.navigate('CreateReport', {});
  };

  const navigateToReportDetail = (reportId: string) => {
    navigation.navigate('ReportDetail', { reportId });
  };

  const navigateToFillReport = (reportId: string) => {
    navigation.navigate('FillReport', { reportId });
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Projeto desconhecido';
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando relatórios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar relatórios..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <View style={styles.searchActions}>
          <Button mode="text" icon="filter-remove" onPress={clearFilters} style={styles.searchActionButton}>
            Limpar filtros
          </Button>
          <Button mode="outlined" icon="download" onPress={handleExportReportsCSV} disabled={!filteredReports || filteredReports.length === 0}>
            Exportar CSV
          </Button>
        </View>
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Status</Text>
          <View style={styles.chipsRow}>
            <Chip
              selected={selectedStatuses.includes('draft')}
              onPress={() => toggleStatus('draft')}
              style={styles.chip}
            >
              Rascunho
            </Chip>
            <Chip
              selected={selectedStatuses.includes('active')}
              onPress={() => toggleStatus('active')}
              style={styles.chip}
            >
              Ativo
            </Chip>
            <Chip
              selected={selectedStatuses.includes('archived')}
              onPress={() => toggleStatus('archived')}
              style={styles.chip}
            >
              Arquivado
            </Chip>
          </View>

          <Text style={styles.filterTitle}>Projeto</Text>
          <View style={styles.chipsRow}>
            <Chip
              selected={!selectedProjectId}
              onPress={() => selectProject(null)}
              style={styles.chip}
            >
              Todos
            </Chip>
            {projects.map((p) => (
              <Chip
                key={p.id}
                selected={selectedProjectId === p.id}
                onPress={() => selectProject(p.id)}
                style={styles.chip}
              >
                {p.name}
              </Chip>
            ))}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>
              {reports.length === 0 ? 'Nenhum relatório encontrado' : 'Nenhum resultado encontrado'}
            </Text>
            <Text style={styles.emptyDescription}>
              {reports.length === 0 
                ? 'Crie seu primeiro relatório para começar a coletar dados'
                : 'Tente ajustar sua busca ou limpar o filtro'
              }
            </Text>
            {reports.length === 0 && (
              <Button
                mode="contained"
                onPress={navigateToCreateReport}
                style={styles.createButton}
                icon="document"
              >
                Criar Primeiro Relatório
              </Button>
            )}
          </View>
        ) : (
          <View style={styles.reportsList}>
            {filteredReports.map((report) => (
              <Card key={report.id} style={styles.reportCard}>
                <Card.Content>
                  <View style={styles.reportHeader}>
                    <View style={styles.reportInfo}>
                      <Text style={styles.reportTitle}>{report.title}</Text>
                      <Text style={styles.projectName}>
                        {getProjectName(report.projectId)}
                      </Text>
                      <Text style={styles.reportDescription} numberOfLines={2}>
                        {report.description || 'Sem descrição'}
                      </Text>
                    </View>
                    <Chip 
                      style={{ backgroundColor: getStatusColor(report.status) }}
                      textStyle={{ color: '#fff' }}
                    >
                      {getStatusText(report.status)}
                    </Chip>
                  </View>

                  <View style={styles.reportMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={16} color="#666" />
                      <Text style={styles.metaText}>
                        {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="list-outline" size={16} color="#666" />
                      <Text style={styles.metaText}>
                        {report.fields.length} campos
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reportActions}>
                    <Button
                      mode="contained"
                      onPress={() => navigateToFillReport(report.id)}
                      style={styles.actionButton}
                      icon="edit"
                      disabled={report.status !== 'ativo'}
                    >
                      Preencher
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => navigateToReportDetail(report.id)}
                      style={styles.actionButton}
                    >
                      Detalhes
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
        onPress={navigateToCreateReport}
        label="Novo Relatório"
      />
    </View>
  );
};

const StatusSummary: React.FC<{ filteredReports: Report[] }> = ({ filteredReports }) => {
  const counts = React.useMemo(() => {
    return filteredReports.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { draft: 0, active: 0, archived: 0 } as Record<'draft' | 'active' | 'archived', number>
    );
  }, [filteredReports]);

  return (
    <View style={styles.statusSummaryRow}>
      <Chip mode="outlined" style={styles.summaryChip}>Rascunho: {counts.draft}</Chip>
      <Chip mode="outlined" style={styles.summaryChip}>Ativo: {counts.active}</Chip>
      <Chip mode="outlined" style={styles.summaryChip}>Arquivado: {counts.archived}</Chip>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#f5f5f5',
  },
  searchActions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  searchActionButton: {
    marginRight: 8,
  },
  filtersContainer: {
    marginTop: 12,
  },
  filterTitle: {
    marginTop: 8,
    marginBottom: 4,
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 6,
    marginBottom: 6,
  },
  statusSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  summaryChip: {
    marginRight: 6,
    marginBottom: 6,
    borderColor: '#ddd',
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
  reportsList: {
    padding: 20,
  },
  reportCard: {
    marginBottom: 16,
    elevation: 2,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  reportInfo: {
    flex: 1,
    marginRight: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
    marginBottom: 4,
  },
  reportDescription: {
    color: '#666',
    lineHeight: 20,
  },
  reportMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
  },
  reportActions: {
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

export default ReportsScreen;

