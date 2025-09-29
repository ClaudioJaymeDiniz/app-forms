import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import {
  Text,
  Card,
  Title,
  Button,
  ActivityIndicator,
  Chip,
  Divider,
} from "react-native-paper";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { useAuth } from "../contexts/AuthContext";
import { databaseService } from "../database/database";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Report, ReportSubmission, User } from "../types";

type ReportResponsesScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "ReportResponses"
>;
type ReportResponsesScreenRouteProp = RouteProp<
  RootStackParamList,
  "ReportResponses"
>;

const ReportResponsesScreen: React.FC = () => {
  const navigation = useNavigation<ReportResponsesScreenNavigationProp>();
  const route = useRoute<ReportResponsesScreenRouteProp>();
  const { state } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [submissions, setSubmissions] = useState<ReportSubmission[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});

  const reportId = route.params?.reportId;

  useEffect(() => {
    if (reportId) {
      loadData();
    }
  }, [reportId]);

  const loadData = async () => {
    try {
      if (!reportId) return;

      console.log("Loading data for report ID:", reportId);

      // Carrega o relatório
      const reportData = await databaseService.getReportById(reportId);
      console.log("Report data loaded:", reportData);
      setReport(reportData);

      // Carrega as submissões
      const submissionsData = await databaseService.getSubmissionsByReportId(
        reportId
      );
      console.log(
        "Submissions data loaded:",
        submissionsData.length,
        "submissions"
      );
      setSubmissions(submissionsData);

      // Carrega informações dos usuários
      const userIds = [...new Set(submissionsData.map((s) => s.userId))];
      const usersData: Record<string, User> = {};

      for (const userId of userIds) {
        const user = await databaseService.getUserById(userId);
        if (user) {
          usersData[userId] = user;
        }
      }

      setUsers(usersData);
    } catch (error) {
      console.error("Error loading report responses:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "#4CAF50";
      case "draft":
        return "#FF9800";
      case "approved":
        return "#2196F3";
      case "rejected":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "submitted":
        return "Enviado";
      case "draft":
        return "Rascunho";
      case "approved":
        return "Aprovado";
      case "rejected":
        return "Rejeitado";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const renderFieldValue = (
    fieldId: string,
    value: any,
    fieldLabel: string
  ) => {
    if (value === null || value === undefined || value === "") {
      return <Text style={styles.fieldValue}>Não preenchido</Text>;
    }

    if (typeof value === "boolean") {
      return <Text style={styles.fieldValue}>{value ? "Sim" : "Não"}</Text>;
    }

    return <Text style={styles.fieldValue}>{String(value)}</Text>;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Carregando respostas...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Relatório não encontrado</Text>
        <Button mode="contained" onPress={() => navigation.goBack()}>
          Voltar
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>{report.title}</Title>
          {report.description && (
            <Text style={styles.description}>{report.description}</Text>
          )}
          <Text style={styles.statsText}>
            Total de respostas: {submissions.length}
          </Text>
        </Card.Content>
      </Card>

      {submissions.length === 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.noResponsesText}>
              Nenhuma resposta foi enviada ainda.
            </Text>
            <Text style={styles.noResponsesSubtext}>
              Para visualizar respostas, os usuários precisam primeiro preencher
              este relatório.
            </Text>
            <Button
              mode="outlined"
              onPress={() =>
                navigation.navigate("FillReport", { reportId: report.id })
              }
              style={styles.fillReportButton}
              icon="edit"
            >
              Preencher este relatório
            </Button>
          </Card.Content>
        </Card>
      ) : (
        submissions.map((submission) => (
          <Card key={submission.id} style={styles.card}>
            <Card.Content>
              <View style={styles.submissionHeader}>
                <View style={styles.submissionInfo}>
                  <Text style={styles.userName}>
                    {users[submission.userId]?.name || "Usuário desconhecido"}
                  </Text>
                  <Text style={styles.userEmail}>
                    {users[submission.userId]?.email || submission.userId}
                  </Text>
                </View>
                <Chip
                  style={[
                    styles.statusChip,
                    { backgroundColor: getStatusColor(submission.status) },
                  ]}
                  textStyle={styles.statusText}
                >
                  {getStatusText(submission.status)}
                </Chip>
              </View>

              <Text style={styles.dateText}>
                {submission.submittedAt
                  ? `Enviado em: ${formatDate(submission.submittedAt)}`
                  : `Última modificação: ${formatDate(
                      submission.lastModified
                    )}`}
              </Text>

              <Divider style={styles.divider} />

              <Text style={styles.responsesTitle}>Respostas:</Text>

              {report.fields.map((field) => (
                <View key={field.id} style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{field.label}:</Text>
                  {renderFieldValue(
                    field.id,
                    submission.data[field.id],
                    field.label
                  )}
                </View>
              ))}

              {submission.status === "submitted" &&
                state.user?.id === report.createdBy && (
                  <View style={styles.actionButtons}>
                    <Button
                      mode="contained"
                      onPress={() => {
                        // TODO: Implementar aprovação
                        console.log("Aprovar submissão:", submission.id);
                      }}
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#4CAF50" },
                      ]}
                      compact
                    >
                      Aprovar
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => {
                        // TODO: Implementar rejeição
                        console.log("Rejeitar submissão:", submission.id);
                      }}
                      style={[
                        styles.actionButton,
                        { backgroundColor: "#F44336" },
                      ]}
                      compact
                    >
                      Rejeitar
                    </Button>
                  </View>
                )}
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  headerCard: {
    marginBottom: 16,
    elevation: 4,
  },
  description: {
    color: "#666",
    marginTop: 8,
    marginBottom: 12,
  },
  statsText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2196F3",
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  noResponsesText: {
    textAlign: "center",
    color: "#666",
    fontSize: 16,
    fontStyle: "italic",
  },
  submissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  submissionInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statusChip: {
    marginLeft: 8,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  responsesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: "#666",
    paddingLeft: 8,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  noResponsesSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  fillReportButton: {
    marginTop: 8,
  },
});

export default ReportResponsesScreen;
