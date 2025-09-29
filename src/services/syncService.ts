import { databaseService } from '../database/database';
import { SyncQueue, ReportSubmission } from '../types';
import NetInfo from '@react-native-community/netinfo';

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
    // Aqui seria implementada a lógica para sincronizar com o servidor
    // Por enquanto, vamos simular uma requisição
    
    const endpoint = this.getEndpointForItem(item);
    const method = this.getMethodForAction(item.action);
    
    // Simulação de requisição HTTP
    await this.makeHttpRequest(endpoint, method, item.data);
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

  private async makeHttpRequest(url: string, method: string, data?: any): Promise<any> {
    // Simulação de requisição HTTP
    // Em uma implementação real, usaria fetch() ou axios
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simula sucesso na maioria dos casos
        if (Math.random() > 0.1) {
          resolve({ success: true });
        } else {
          reject(new Error('Network error'));
        }
      }, 1000);
    });
  }

  private async syncPendingSubmissions(): Promise<void> {
    // Busca submissões que estão pendentes de sincronização
    const submissions = await databaseService.getSubmissionsByUserId('current_user_id'); // TODO: pegar ID do usuário atual
    const pendingSubmissions = submissions.filter(s => s.syncStatus === 'pending');
    
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
    const endpoint = `https://api.reportsapp.com/submissions/${submission.id}`;
    const method = submission.isOffline ? 'POST' : 'PUT';
    
    await this.makeHttpRequest(endpoint, method, {
      reportId: submission.reportId,
      userId: submission.userId,
      data: submission.data,
      status: submission.status,
      submittedAt: submission.submittedAt,
      version: submission.version
    });
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

  // Método para salvar submissão offline
  async saveSubmissionOffline(
    reportId: string,
    userId: string,
    data: Record<string, any>,
    status: 'draft' | 'submitted' = 'draft'
  ): Promise<string> {
    const submissionId = await databaseService.createSubmission({
      reportId,
      userId,
      data,
      status,
      submittedAt: status === 'submitted' ? new Date().toISOString() : undefined,
      lastModified: new Date().toISOString(),
      version: 1,
      isOffline: true,
      syncStatus: 'pending'
    });

    // Adiciona à fila de sincronização
    await this.addToSyncQueue('submission', 'create', submissionId, {
      reportId,
      userId,
      data,
      status,
      submittedAt: status === 'submitted' ? new Date().toISOString() : undefined
    });

    return submissionId;
  }

  // Método para atualizar submissão offline
  async updateSubmissionOffline(
    submissionId: string,
    data: Record<string, any>,
    status?: 'draft' | 'submitted'
  ): Promise<void> {
    const updateData: Partial<ReportSubmission> = {
      data,
      syncStatus: 'pending'
    };

    if (status) {
      updateData.status = status;
      if (status === 'submitted') {
        updateData.submittedAt = new Date().toISOString();
      }
    }

    await databaseService.updateSubmission(submissionId, updateData);

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

