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
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Entypo from "@expo/vector-icons/Entypo";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../contexts/AuthContext";
import { databaseService } from "../database/database";
import { syncService } from "../services/syncService";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Project, Report, ReportSubmission, DashboardStats } from "../types";

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList>;

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
  const [stats, setStats] = useState<DashboardStats>({
    totalReports: 0,
    pendingReports: 0,
    completedReports: 0,
    overdueReports: 0,
    recentActivity: [],
  });
  const [isOnline, setIsOnline] = useState(syncService.isConnected());

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
      setRecentSubmissions(userSubmissions.slice(0, 5));

      // Calcula estatísticas
      const totalReports = allReports.length;
      const pendingReports = userSubmissions.filter(
        (s) => s.status === "draft"
      ).length;
      const completedReports = userSubmissions.filter(
        (s) => s.status === "submitted"
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
      case "draft":
        return "#FF9800";
      case "submitted":
        return "#4CAF50";
      case "approved":
        return "#2196F3";
      case "rejected":
        return "#F44336";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "draft":
        return "Rascunho";
      case "submitted":
        return "Enviado";
      case "approved":
        return "Aprovado";
      case "rejected":
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
