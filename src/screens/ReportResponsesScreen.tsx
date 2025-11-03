import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Image, Platform, TouchableOpacity } from "react-native";
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
import { exportSubmissionsToCSV } from "../utils/exportUtils";
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

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

  const handleExportSubmittedCSV = async () => {
    try {
      const submitted = submissions.filter((s) => s.status === "enviado");
      if (submitted.length === 0) {
        Alert.alert("Sem respostas enviadas", "Não há respostas com status 'Enviado' para exportar.");
        return;
      }
      const baseTitle = report.title || "relatorio";
      const slug = baseTitle
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/--+/g, "-") || "relatorio";
      const fileName = `respostas-${slug}.csv`;
      const path = await exportSubmissionsToCSV(submitted, fileName);
      Alert.alert("Exportação concluída", `Arquivo salvo: ${path}`);
    } catch (err) {
      Alert.alert("Erro", "Falha ao exportar CSV de respostas enviadas");
    }
  };

  const hasSubmitted = submissions.some((s) => s.status === "enviado");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "enviado":
        return "#4CAF50";
      case "rascunho":
        return "#FF9800";
      case "aprovado":
        return "#2196F3";
      case "rejeitado":
        return "#F44336";
      default:
        return "#757575";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "enviado":
        return "Enviado";
      case "rascunho":
        return "Rascunho";
      case "aprovado":
        return "Aprovado";
      case "rejeitado":
        return "Rejeitado";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const renderFieldValue = (
    field: Report["fields"][number],
    value: any
  ) => {
    if (value === null || value === undefined || value === "") {
      return <Text style={styles.fieldValue}>Não preenchido</Text>;
    }

  if (typeof value === "boolean") {
    return <Text style={styles.fieldValue}>{value ? "Sim" : "Não"}</Text>;
  }

  // Suporte para valores como string (uri) e arrays de arquivos/imagens
  if (typeof value === 'string' || Array.isArray(value)) {
    type FileEntry = { uri: string; name?: string; mimeType?: string; size?: number };
    const items = Array.isArray(value) ? value : [value];
    const entries: Array<FileEntry | null> = items
      .map((v) =>
        typeof v === 'string'
          ? {
              uri: v,
              name: (v.split('/').pop() ?? undefined),
              mimeType: field.type === 'image' ? 'image/*' : undefined,
            }
          : null
      );
    const entriesFiltered: FileEntry[] = entries.filter((e): e is FileEntry => !!e);

    if (entries.length > 0) {
      return (
        <View style={{ paddingLeft: 8 }}>
          {entriesFiltered.map((file, idx) => {
            const isImage = field.type === 'image' || (file.mimeType?.startsWith('image/'));
            if (isImage) {
              return (
                <View key={`${file.uri}-${idx}`} style={{ marginBottom: 10 }}>
                  <Image source={{ uri: file.uri }} style={{ width: 240, height: 180, borderRadius: 6 }} />
                  {file.name ? <Text style={{ marginTop: 6, color: '#666' }}>{file.name}</Text> : null}
                  {Platform.OS === 'web' ? (
                    <TouchableOpacity onPress={() => (window.open(file.uri, '_blank') as any)}>
                      <Text style={{ color: '#2196F3', marginTop: 4 }}>Abrir em nova guia</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              );
            }
            return (
              <View key={`${file.uri}-${idx}`} style={{ marginBottom: 10 }}>
                <Text style={{ color: '#666' }}>{file.name || 'arquivo'}</Text>
                {Platform.OS === 'web' ? (
                  <TouchableOpacity onPress={() => (window.open(file.uri, '_blank') as any)} style={{ marginTop: 6 }}>
                    <Text style={{ color: '#2196F3' }}>Abrir/Compartilhar</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>
      );
    }
  }

  // Exibir imagens e arquivos quando o valor vier do DocumentPicker
  if (typeof value === 'object' && value !== null && 'uri' in value) {
      const file = value as { uri: string; name?: string; mimeType?: string; size?: number };
      const isImage = field.type === 'image' || (file.mimeType?.startsWith('image/'));

      if (isImage) {
        return (
          <View style={{ paddingLeft: 8 }}>
            <Image source={{ uri: file.uri }} style={{ width: 240, height: 180, borderRadius: 6 }} />
            {file.name ? <Text style={{ marginTop: 6, color: '#666' }}>{file.name}</Text> : null}
            {Platform.OS === 'web' && /^https?:\/\//.test(file.uri) ? (
              <TouchableOpacity onPress={() => window.open(file.uri, '_blank') as any}>
                <Text style={{ color: '#2196F3', marginTop: 4 }}>Abrir em nova guia</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      }

      // Arquivos genéricos: oferecer compartilhamento/abertura
      const handleOpenFile = async () => {
        try {
          if (Platform.OS === 'android' && file.uri.startsWith('content://')) {
            // Garantir content URI legível
            const contentUri = await FileSystem.getContentUriAsync(file.uri);
            const available = await Sharing.isAvailableAsync();
            if (available) {
              await Sharing.shareAsync(contentUri, { mimeType: file.mimeType || 'application/octet-stream' });
              return;
            }
          }

          const available = await Sharing.isAvailableAsync();
          if (available) {
            await Sharing.shareAsync(file.uri, { mimeType: file.mimeType || 'application/octet-stream' });
          } else if (Platform.OS === 'web' && /^https?:\/\//.test(file.uri)) {
            window.open(file.uri, '_blank');
          } else {
            Alert.alert('Abertura não suportada', 'Não foi possível abrir/compartilhar este arquivo nesta plataforma.');
          }
        } catch (e) {
          console.error('Erro ao abrir arquivo:', e);
          Alert.alert('Erro', 'Falha ao abrir o arquivo.');
        }
      };

      return (
        <View style={{ paddingLeft: 8 }}>
          <Text style={{ color: '#666' }}>{file.name || 'arquivo'}</Text>
          <TouchableOpacity onPress={handleOpenFile} style={{ marginTop: 6 }}>
            <Text style={{ color: '#2196F3' }}>Abrir/Compartilhar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Strings/ números
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
          <View style={styles.headerActions}>
            <Button mode="outlined" icon="download" onPress={handleExportSubmittedCSV} disabled={!hasSubmitted}>
              Exportar CSV (Enviadas)
            </Button>
          </View>
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
              icon="pencil"
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
                  {renderFieldValue(field, submission.data[field.id])}
                </View>
              ))}

              {submission.status === "enviado" &&
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
  headerActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
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
