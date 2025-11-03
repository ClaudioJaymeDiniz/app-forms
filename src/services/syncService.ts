import { databaseService } from '../database/database';
import { SyncQueue, ReportSubmission } from '../types';
import NetInfo from '@react-native-community/netinfo';
import { db } from './firebaseService';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

class SyncService {
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;
  private syncInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initNetworkListener();
  }

  private initNetworkListener(): void {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // Se voltou a ficar online, inicia sincronização
      if (wasOffline && this.isOnline) {
        this.startSync();
      }
      
      // Se ficou offline, para a sincronização automática
      if (!this.isOnline) {
        this.stopSync();
      }
    });
  }

  async startSync(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    console.log('Starting sync process...');
    this.syncInProgress = true;

    try {
      // Verifica se o banco foi inicializado antes de sincronizar
      if (!databaseService.isInitialized()) {
        console.warn('Database not initialized, skipping sync');
        return;
      }

      await this.processSyncQueue();
      await this.syncPendingSubmissions();
      
      // Programa próxima sincronização em 30 segundos
      this.scheduleSyncInterval();
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  private scheduleSyncInterval(): void {
    this.stopSync();
    
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.startSync();
      }
    }, 30000); // 30 segundos
  }

  private async processSyncQueue(): Promise<void> {
    const pendingItems = await databaseService.getPendingSyncItems();
    
    for (const item of pendingItems) {
      try {
        await this.syncItem(item);
        await databaseService.removeSyncQueueItem(item.id);
        console.log(`Synced item: ${item.type} ${item.action} ${item.entityId}`);
      } catch (error) {
        console.error(`Failed to sync item ${item.id}:`, error);
        await databaseService.updateSyncQueueItem(
          item.id, 
          item.attempts + 1, 
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  }

  private async syncItem(item: SyncQueue): Promise<void> {
    const collectionMap: Record<SyncQueue['type'], string> = {
      user: 'users',
      project: 'projects',
      report: 'reports',
      submission: 'report_submissions'
    };

    const col = collectionMap[item.type];
    const ref = doc(db, col, item.entityId);

    if (item.action === 'delete') {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, item.data, { merge: item.action === 'update' });
    }
  }

  private getEndpointForItem(item: SyncQueue): string {
    const baseUrl = 'https://api.reportsapp.com'; // URL base da API
    
    switch (item.type) {
      case 'submission':
        return `${baseUrl}/submissions/${item.entityId}`;
      case 'report':
        return `${baseUrl}/reports/${item.entityId}`;
      case 'user':
        return `${baseUrl}/users/${item.entityId}`;
      case 'project':
        return `${baseUrl}/projects/${item.entityId}`;
      default:
        throw new Error(`Unknown sync item type: ${item.type}`);
    }
  }

  private getMethodForAction(action: string): string {
    switch (action) {
      case 'create':
        return 'POST';
      case 'update':
        return 'PUT';
      case 'delete':
        return 'DELETE';
      default:
        throw new Error(`Unknown sync action: ${action}`);
    }
  }

  // remove HTTP simulation; Firestore is used directly above

  private async syncPendingSubmissions(): Promise<void> {
    // Busca submissões que estão pendentes de sincronização diretamente do banco
    const pendingSubmissions = await databaseService.getPendingSubmissions();

    for (const submission of pendingSubmissions) {
      try {
        await this.syncSubmission(submission);
        await databaseService.updateSubmission(submission.id, {
          syncStatus: 'synced'
        });
        console.log(`Synced submission: ${submission.id}`);
      } catch (error) {
        console.error(`Failed to sync submission ${submission.id}:`, error);
        await databaseService.updateSubmission(submission.id, {
          syncStatus: 'error'
        });
      }
    }
  }

  private async syncSubmission(submission: ReportSubmission): Promise<void> {
    const ref = doc(db, 'report_submissions', submission.id);
    await setDoc(ref, {
      reportId: submission.reportId,
      userId: submission.userId,
      data: submission.data,
      status: submission.status,
      submittedAt: submission.submittedAt,
      version: submission.version
    }, { merge: true });
  }

  // Método para adicionar item à fila de sincronização
  async addToSyncQueue(
    type: SyncQueue['type'],
    action: SyncQueue['action'],
    entityId: string,
    data: any
  ): Promise<void> {
    await databaseService.addToSyncQueue({
      type,
      action,
      entityId,
      data,
      attempts: 0,
      createdAt: new Date().toISOString()
    });

    // Se estiver online, tenta sincronizar imediatamente
    if (this.isOnline && !this.syncInProgress) {
      this.startSync();
    }
  }

  // Semear todos os dados locais para o Firebase (primeira sincronização)
  async seedAllToFirebase(): Promise<void> {
    if (!databaseService.isInitialized()) return;

    const [users, projects, reports, submissions] = await Promise.all([
      databaseService.getAllUsers(),
      databaseService.getAllProjects(),
      databaseService.getAllReports(),
      databaseService.getAllSubmissions(),
    ]);

    for (const user of users) {
      await this.addToSyncQueue('user', 'create', user.id, user);
    }
    for (const project of projects) {
      await this.addToSyncQueue('project', 'create', project.id, project);
    }
    for (const report of reports) {
      await this.addToSyncQueue('report', 'create', report.id, report);
    }
    for (const submission of submissions) {
      await this.addToSyncQueue('submission', 'create', submission.id, submission);
    }
  }

  // Método para salvar submissão offline
  async saveSubmissionOffline(
    reportId: string,
    userId: string,
    data: Record<string, any>,
    status: 'rascunho' | 'enviado' = 'rascunho'
  ): Promise<string> {
    const submissionId = await databaseService.createSubmission({
      reportId,
      userId,
      data,
      status,
      submittedAt: status === 'enviado' ? new Date().toISOString() : undefined,
      lastModified: new Date().toISOString(),
      version: 1,
      isOffline: true,
      syncStatus: 'pending'
    });

    // Registrar versão inicial
    await databaseService.createReportVersion({
      submissionId: submissionId,
      version: 1,
      data,
      changedBy: userId,
      changedAt: new Date().toISOString(),
      changes: 'Initial submission'
    });

    // Adiciona à fila de sincronização
    await this.addToSyncQueue('submission', 'create', submissionId, {
      reportId,
      userId,
      data,
      status,
      submittedAt: status === 'enviado' ? new Date().toISOString() : undefined
    });

    return submissionId;
  }

  // Método para atualizar submissão offline
  async updateSubmissionOffline(
    submissionId: string,
    data: Record<string, any>,
    status?: 'rascunho' | 'enviado',
    changedBy?: string
  ): Promise<void> {
    const existing = await databaseService.getSubmissionById(submissionId);
    const now = new Date().toISOString();
    const newVersion = (existing?.version ?? 1) + 1;

    const updateData: Partial<ReportSubmission> = {
      data,
      lastModified: now,
      version: newVersion,
      syncStatus: 'pending'
    };

    if (status) {
      updateData.status = status;
      if (status === 'enviado') {
        updateData.submittedAt = now;
      }
    }

    await databaseService.updateSubmission(submissionId, updateData);

    // Registrar versão
    await databaseService.createReportVersion({
      submissionId,
      version: newVersion,
      data,
      changedBy: changedBy || 'system',
      changedAt: now,
      changes: status === 'enviado' ? 'Submitted update' : 'Draft update'
    });

    // Adiciona à fila de sincronização
    await this.addToSyncQueue('submission', 'update', submissionId, {
      data,
      status
    });
  }

  // Método para verificar status da conectividade
  isConnected(): boolean {
    return this.isOnline;
  }

  // Método para forçar sincronização manual
  async forcSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    await this.startSync();
  }

  // Método para obter estatísticas de sincronização
  async getSyncStats(): Promise<{
    pendingItems: number;
    failedItems: number;
    lastSyncTime: string | null;
  }> {
    const pendingItems = await databaseService.getPendingSyncItems();
    const failedItems = pendingItems.filter(item => item.attempts >= 3);
    
    return {
      pendingItems: pendingItems.length,
      failedItems: failedItems.length,
      lastSyncTime: null // TODO: implementar tracking do último sync
    };
  }

  // Método para limpar itens de sincronização falhados
  async clearFailedSyncItems(): Promise<void> {
    const pendingItems = await databaseService.getPendingSyncItems();
    const failedItems = pendingItems.filter(item => item.attempts >= 3);
    
    for (const item of failedItems) {
      await databaseService.removeSyncQueueItem(item.id);
    }
  }
}

export const syncService = new SyncService();

