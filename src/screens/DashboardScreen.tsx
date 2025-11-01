import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Chip,
  Surface,
  ActivityIndicator,
  FAB,
  Searchbar,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation, CompositeNavigationProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

import { useAuth } from "../contexts/AuthContext";
import { databaseService } from "../database/database";
import { syncService } from "../services/syncService";
import { RootStackParamList, MainTabParamList } from "../navigation/AppNavigator";
import { Project, Report, ReportSubmission, DashboardStats, ReportFilter } from "../types";
import { Alert } from "react-native";
import { exportSubmissionsToCSV } from "../utils/exportUtils";

type DashboardScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const authContext = useAuth();
  const { state } = authContext;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentReports, setRecentReports] = useState<Report[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<
    ReportSubmission[]
  >([]);
  const [allUserSubmissions, setAllUserSubmissions] = useState<ReportSubmission[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
    overdueReports: 0,
    recentActivity: [],
  });
  const [isOnline, setIsOnline] = useState(syncService.isConnected());
  const [filters, setFilters] = useState<ReportFilter>({
    status: [],
    projectId: undefined,
    searchTerm: "",
    dateRange: undefined,
  });

  useEffect(() => {
    loadDashboardData();

    // Verifica status de conectividade periodicamente
    const interval = setInterval(() => {
      setIsOnline(syncService.isConnected());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      if (!state || !state.user) {
        console.warn("User state not available");
        return;
      }

      // Carrega projetos do usuário
      const userProjects = await databaseService.getProjectsByUserId(
        state.user.id
      );
      setProjects(userProjects);

      // Carrega relatórios recentes
      const allReports: Report[] = [];
      for (const project of userProjects) {
        const projectReports = await databaseService.getReportsByProjectId(
          project.id
        );
        allReports.push(...projectReports);
      }

      // Ordena por data de criação (mais recentes primeiro)
      const sortedReports = allReports.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecentReports(sortedReports.slice(0, 5));

      // Carrega submissões do usuário
      const userSubmissions = await databaseService.getSubmissionsByUserId(
        state.user.id
      );
      setAllUserSubmissions(userSubmissions);
      setRecentSubmissions(userSubmissions.slice(0, 5));

      // Calcula estatísticas
      const totalReports = allReports.length;
      const pendingReports = userSubmissions.filter(
        (s) => s.status === "rascunho"
      ).length;
      const completedReports = userSubmissions.filter(
        (s) => s.status === "enviado"
      ).length;
      const overdueReports = 0; // TODO: implementar lógica de prazo

      setStats({
        totalReports,
        pendingReports,
        completedReports,
        overdueReports,
        recentActivity: [], // TODO: implementar atividade recente
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleStatusFilter = (status: string) => {
    setFilters((prev) => {
      const current = prev.status || [];
      const exists = current.includes(status);
      return { ...prev, status: exists ? current.filter((s) => s !== status) : [...current, status] };
    });
  };

  const applyFilters = () => {
    const matchesStatus = (s: ReportSubmission) => {
      if (!filters.status || filters.status.length === 0) return true;
      return filters.status.includes(s.status);
    };

    const matchesProject = (s: ReportSubmission) => {
      if (!filters.projectId) return true;
      const report = recentReports.find((r) => r.id === s.reportId);
      return report ? report.projectId === filters.projectId : true;
    };

    const matchesSearch = (s: ReportSubmission) => {
      const term = (filters.searchTerm || '').trim().toLowerCase();
      if (!term) return true;
      const report = recentReports.find((r) => r.id === s.reportId);
      const inReport = report && (
        report.title.toLowerCase().includes(term) ||
        (report.description || '').toLowerCase().includes(term)
      );
      const inData = JSON.stringify(s.data || {}).toLowerCase().includes(term);
      return !!inReport || inData;
    };

    return allUserSubmissions.filter((s) => matchesStatus(s) && matchesProject(s) && matchesSearch(s));
  };

  const filteredSubmissions = applyFilters();
  const hasFiltered = filteredSubmissions.length > 0;
  const statusCounts = {
    rascunho: filteredSubmissions.filter((s) => s.status === 'rascunho').length,
    enviado: filteredSubmissions.filter((s) => s.status === 'enviado').length,
    aprovado: filteredSubmissions.filter((s) => s.status === 'aprovado').length,
    rejeitado: filteredSubmissions.filter((s) => s.status === 'rejeitado').length,
  };

  const maxCount = Math.max(1, ...Object.values(statusCounts));

  const handleExportCSV = async () => {
    try {
      if (filteredSubmissions.length === 0) {
        Alert.alert('Sem dados', 'Não há submissões filtradas para exportar.');
        return;
      }
      const base = 'submissoes';
      const projectSlug = filters.projectId
        ? (projects.find((p) => p.id === filters.projectId)?.name || 'projeto')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .replace(/--+/g, '-')
        : '';
      const statusSlug = (filters.status && filters.status.length > 0)
        ? filters.status.join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '-')
        : '';
      const q = (filters.searchTerm || '').trim();
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
      const dateSlug = (filters.dateRange && filters.dateRange.start && filters.dateRange.end)
        ? (() => {
            const fmt = (s: string) => {
              try { return new Date(s).toISOString().slice(0, 10); } catch { return s; }
            };
            return `de-${fmt(filters.dateRange.start)}-a-${fmt(filters.dateRange.end)}`
              .toLowerCase()
              .replace(/[^a-z0-9-]+/g, '-')
              .replace(/--+/g, '-');
          })()
        : '';
      const parts = [base, projectSlug, statusSlug, querySlug, dateSlug].filter(Boolean);
      const fileName = `${parts.join('-') || base}.csv`;
      const path = await exportSubmissionsToCSV(filteredSubmissions, fileName);
      Alert.alert('Exportação concluída', `Arquivo salvo: ${path}`);
    } catch (err) {
      Alert.alert('Erro', 'Falha ao exportar CSV');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const navigateToCreateProject = () => {
    navigation.navigate("CreateProject");
  };

  const navigateToCreateReport = () => {
    navigation.navigate("CreateReport", {});
  };

  const navigateToReportDetail = (reportId: string) => {
    navigation.navigate("ReportDetail", { reportId });
  };

  const navigateToReportResponses = (reportId: string) => {
    navigation.navigate("ReportResponses", { reportId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "rascunho":
        return "#FF9800";
      case "enviado":
        return "#4CAF50";
      case "aprovado":
        return "#2196F3";
      case "rejeitado":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "rascunho":
        return "Rascunho";
      case "enviado":
        return "Enviado";
      case "aprovado":
        return "Aprovado";
      case "rejeitado":
        return "Rejeitado";
      default:
        return "Desconhecido";
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Carregando dashboard...</Text>
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
        {/* Header com saudação */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Olá, {state.user?.name || "Usuário"}!
          </Text>
          <View style={styles.statusContainer}>
            <Chip
              icon={isOnline ? "wifi" : "wifi-off"}
              style={[
                styles.statusChip,
                { backgroundColor: isOnline ? "#4CAF50" : "#F44336" },
              ]}
              textStyle={{ color: "#fff" }}
            >
              {isOnline ? "Online" : "Offline"}
            </Chip>
          </View>
        </View>

        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Reports")}
          >
            <Surface style={styles.statCardSurface}>
              <Text style={styles.statNumber}>{stats.totalReports}</Text>
              <Text style={styles.statLabel}>Total de Relatórios</Text>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Reports")}
          >
            <Surface style={styles.statCardSurface}>
              <Text style={styles.statNumber}>{stats.pendingReports}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Reports")}
          >
            <Surface style={styles.statCardSurface}>
              <Text style={styles.statNumber}>{stats.completedReports}</Text>
              <Text style={styles.statLabel}>Concluídos</Text>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate("Projects")}
          >
            <Surface style={styles.statCardSurface}>
              <Text style={styles.statNumber}>{projects.length}</Text>
              <Text style={styles.statLabel}>Projetos</Text>
            </Surface>
          </TouchableOpacity>
        </View>

        {/* Ações rápidas */}
        <Card style={styles.card}>
          <Card.Content>
            <Text>Ações Rápidas</Text>
            <View style={styles.quickActions}>
              <Button
                mode="contained"
                onPress={navigateToCreateProject}
                style={styles.actionButton}
                icon="folder-plus"
              >
                Novo Projeto
              </Button>
              <Button
                mode="outlined"
                onPress={navigateToCreateReport}
                style={styles.actionButton}
                // icon="text-document"
              >
                <Entypo name="text-document" />
                Novo Relatório
              </Button>
              <Button
                mode="outlined"
                onPress={handleExportCSV}
                style={styles.actionButton}
                disabled={!hasFiltered}
              >
                <Ionicons name="download" size={18} /> Exportar CSV
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Filtros */}
        <Card style={styles.card}>
          <Card.Content>
            <Text>Filtros</Text>
            <View style={{ marginTop: 12 }}>
              <Searchbar
                placeholder="Buscar por título, descrição ou dados"
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev, searchTerm: text }))}
                style={{ marginBottom: 12 }}
              />
              <Text style={{ marginBottom: 8 }}>Status</Text>
              <View style={styles.filterRow}>
                {['rascunhos', 'enviados', 'aprovados', 'rejeitados'].map((st) => (
                  <Chip
                    key={st}
                    selected={filters.status?.includes(st)}
                    onPress={() => toggleStatusFilter(st)}
                    style={styles.filterChip}
                  >
                    {st}
                  </Chip>
                ))}
              </View>
              <Text style={{ marginVertical: 8 }}>Projetos</Text>
              <View style={styles.filterRow}>
                {projects.map((p) => (
                  <Chip
                    key={p.id}
                    selected={filters.projectId === p.id}
                    onPress={() => setFilters((prev) => ({ ...prev, projectId: prev.projectId === p.id ? undefined : p.id }))}
                    style={styles.filterChip}
                  >
                    {p.name}
                  </Chip>
                ))}
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Gráfico simples por status */}
        <Card style={styles.card}>
          <Card.Content>
            <Text>Resumo por Status</Text>
            <View style={styles.chartRow}>
              {Object.entries(statusCounts).map(([key, count]) => (
                <View key={key} style={styles.chartBarContainer}>
                  <View style={[styles.chartBar, { height: Math.max(20, (count / maxCount) * 120) }]} />
                  <Text style={styles.chartLabel}>{key} ({count})</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Relatórios recentes */}
        <Card style={styles.card}>
          <Card.Content>
            <Text>Relatórios Recentes</Text>
            {recentReports.length === 0 ? (
              <Text style={styles.emptyText}>
                Nenhum relatório encontrado. Crie seu primeiro relatório!
              </Text>
            ) : (
              recentReports.map((report) => (
                <Surface key={report.id} style={styles.reportItem}>
                  <View style={styles.reportHeader}>
                    <Text style={styles.reportTitle}>{report.title}</Text>
                    <Chip
                      style={{ backgroundColor: getStatusColor(report.status) }}
                      textStyle={{ color: "#fff" }}
                    >
                      {getStatusText(report.status)}
                    </Chip>
                  </View>
                  <Text style={styles.reportDescription} numberOfLines={2}>
                    {report.description || "Sem descrição"}
                  </Text>
                  <View style={styles.reportActions}>
                    <Button
                      mode="text"
                      onPress={() => navigateToReportDetail(report.id)}
                      compact
                    >
                      Ver detalhes
                    </Button>
                    {state &&
                      state.user &&
                      state.user.id === report.createdBy && (
                        <Button
                          mode="text"
                          onPress={() => navigateToReportResponses(report.id)}
                          compact
                          icon="eye"
                        >
                          Ver respostas
                        </Button>
                      )}
                  </View>
                </Surface>
              ))
            )}
          </Card.Content>
        </Card>

        {/* Submissões recentes */}
        {recentSubmissions.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text>Minhas Submissões Recentes</Text>
              {recentSubmissions.map((submission) => (
                <Surface key={submission.id} style={styles.submissionItem}>
                  <View style={styles.submissionHeader}>
                    <Ionicons name="document" size={20} color="#2196F3" />
                    <Text style={styles.submissionTitle}>
                      Relatório #{submission.reportId.slice(-6)}
                    </Text>
                    <Chip
                      style={{
                        backgroundColor: getStatusColor(submission.status),
                      }}
                      textStyle={{ color: "#fff" }}
                    >
                      {getStatusText(submission.status)}
                    </Chip>
                  </View>
                  <Text style={styles.submissionDate}>
                    Última modificação:{" "}
                    {new Date(submission.lastModified).toLocaleDateString(
                      "pt-BR"
                    )}
                  </Text>
                </Surface>
              ))}
            </Card.Content>
          </Card>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusChip: {
    elevation: 2,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
  },
  statCardSurface: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    alignItems: "center",
    width: "100%",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2196F3",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 160,
    marginTop: 12,
  },
  chartBarContainer: {
    alignItems: 'center',
    width: 70,
  },
  chartBar: {
    width: 40,
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  chartLabel: {
    marginTop: 6,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    fontStyle: "italic",
    marginTop: 16,
  },
  reportItem: {
    padding: 16,
    marginTop: 12,
    borderRadius: 8,
    elevation: 1,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  reportDescription: {
    color: "#666",
    marginBottom: 8,
  },
  submissionItem: {
    padding: 16,
    marginTop: 12,
    borderRadius: 8,
    elevation: 1,
  },
  submissionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
  },
  submissionDate: {
    color: "#666",
    fontSize: 12,
  },
  reportActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomSpacing: {
    height: 80,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: "#2196F3",
  },
});

export default DashboardScreen;
