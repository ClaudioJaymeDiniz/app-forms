import * as SQLite from "expo-sqlite";
import {
  User,
  Project,
  Report,
  ReportSubmission,
  ReportVersion,
  Notification,
  SyncQueue,
} from "../types";

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  isInitialized(): boolean {
    return this.db !== null;
  }

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync("reports.db");
      await this.createTables();
      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Error initializing database:", error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tables = [
      // Tabela de usuários
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Tabela de projetos
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        owner_id TEXT NOT NULL,
        settings TEXT NOT NULL, -- JSON string
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (owner_id) REFERENCES users (id)
      )`,

      // Tabela de relatórios
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        fields TEXT NOT NULL, -- JSON string
        permissions TEXT NOT NULL, -- JSON string
        status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Tabela de submissões de relatórios
      `CREATE TABLE IF NOT EXISTS report_submissions (
        id TEXT PRIMARY KEY,
        report_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON string
        status TEXT NOT NULL CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
        submitted_at TEXT,
        last_modified TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        is_offline INTEGER NOT NULL DEFAULT 0,
        sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'error')),
        FOREIGN KEY (report_id) REFERENCES reports (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Tabela de versões de relatórios
      `CREATE TABLE IF NOT EXISTS report_versions (
        id TEXT PRIMARY KEY,
        submission_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL, -- JSON string
        changed_by TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        changes TEXT NOT NULL,
        FOREIGN KEY (submission_id) REFERENCES report_submissions (id),
        FOREIGN KEY (changed_by) REFERENCES users (id)
      )`,

      // Tabela de notificações
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('report_available', 'deadline_approaching', 'new_result', 'report_approved', 'report_rejected')),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT, -- JSON string
        read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Tabela de fila de sincronização
      `CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('submission', 'report', 'user', 'project')),
        action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL, -- JSON string
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt TEXT,
        error TEXT,
        created_at TEXT NOT NULL
      )`,
    ];

    for (const table of tables) {
      await this.db.execAsync(table);
    }

    // Criar índices para melhor performance
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)",
      "CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports (project_id)",
      "CREATE INDEX IF NOT EXISTS idx_submissions_report_id ON report_submissions (report_id)",
      "CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON report_submissions (user_id)",
      "CREATE INDEX IF NOT EXISTS idx_submissions_sync_status ON report_submissions (sync_status)",
      "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)",
      "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications (read)",
      "CREATE INDEX IF NOT EXISTS idx_sync_queue_type ON sync_queue (type)",
      "CREATE INDEX IF NOT EXISTS idx_sync_queue_attempts ON sync_queue (attempts)",
    ];

    for (const index of indexes) {
      await this.db.execAsync(index);
    }
  }

  // Métodos para usuários
  async createUser(user: Omit<User, "id">): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      "INSERT INTO users (id, email, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, user.email, user.name, user.role, now, now]
    );

    return id;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<any>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (!result) return null;

    return {
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<any>(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (!result) return null;

    return {
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  // Métodos para projetos
  async createProject(project: Omit<Project, "id">): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      "INSERT INTO projects (id, name, description, owner_id, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        project.name,
        project.description || "",
        project.ownerId,
        JSON.stringify(project.settings),
        now,
        now,
      ]
    );

    return id;
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    if (!this.db) throw new Error("Database not initialized");

    const results = await this.db.getAllAsync<any>(
      "SELECT * FROM projects WHERE owner_id = ? ORDER BY created_at DESC",
      [userId]
    );

    return results.map((result) => ({
      id: result.id,
      name: result.name,
      description: result.description,
      ownerId: result.owner_id,
      settings: JSON.parse(result.settings),
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    }));
  }

  // Métodos para relatórios
  async createReport(report: Omit<Report, "id">): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      "INSERT INTO reports (id, project_id, title, description, fields, permissions, status, created_at, updated_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        report.projectId,
        report.title,
        report.description || "",
        JSON.stringify(report.fields),
        JSON.stringify(report.permissions),
        report.status,
        now,
        now,
        report.createdBy,
      ]
    );

    return id;
  }

  async getReportsByProjectId(projectId: string): Promise<Report[]> {
    if (!this.db) throw new Error("Database not initialized");

    const results = await this.db.getAllAsync<any>(
      "SELECT * FROM reports WHERE project_id = ? ORDER BY created_at DESC",
      [projectId]
    );

    return results.map((result) => ({
      id: result.id,
      projectId: result.project_id,
      title: result.title,
      description: result.description,
      fields: JSON.parse(result.fields),
      permissions: JSON.parse(result.permissions),
      status: result.status,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      createdBy: result.created_by,
    }));
  }

  async getAllReports(): Promise<Report[]> {
    if (!this.db) throw new Error("Database not initialized");

    const results = await this.db.getAllAsync<any>(
      "SELECT * FROM reports ORDER BY created_at DESC"
    );

    return results.map((result) => ({
      id: result.id,
      projectId: result.project_id,
      title: result.title,
      description: result.description,
      fields: JSON.parse(result.fields),
      permissions: JSON.parse(result.permissions),
      status: result.status,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      createdBy: result.created_by,
    }));
  }

  async getReportById(id: string): Promise<Report | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<any>(
      "SELECT * FROM reports WHERE id = ?",
      [id]
    );

    if (!result) return null;

    return {
      id: result.id,
      projectId: result.project_id,
      title: result.title,
      description: result.description,
      fields: JSON.parse(result.fields),
      permissions: JSON.parse(result.permissions),
      status: result.status,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
      createdBy: result.created_by,
    };
  }

  // Métodos para submissões
  async getSubmissionsByReportId(
    reportId: string
  ): Promise<ReportSubmission[]> {
    if (!this.db) throw new Error("Database not initialized");

    const results = await this.db.getAllAsync<any>(
      "SELECT * FROM report_submissions WHERE report_id = ? ORDER BY last_modified DESC",
      [reportId]
    );

    return results.map((result) => ({
      id: result.id,
      reportId: result.report_id,
      userId: result.user_id,
      data: JSON.parse(result.data),
      status: result.status,
      submittedAt: result.submitted_at,
      lastModified: result.last_modified,
      version: result.version,
      isOffline: Boolean(result.is_offline),
      syncStatus: result.sync_status,
    }));
  }

  async getUserById(id: string): Promise<User | null> {
    if (!this.db) throw new Error("Database not initialized");

    const result = await this.db.getFirstAsync<any>(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (!result) return null;

    return {
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.role,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };
  }

  async createSubmission(
    submission: Omit<ReportSubmission, "id">
  ): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      "INSERT INTO report_submissions (id, report_id, user_id, data, status, submitted_at, last_modified, version, is_offline, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        submission.reportId,
        submission.userId,
        JSON.stringify(submission.data),
        submission.status,
        submission.submittedAt || null,
        now,
        submission.version,
        submission.isOffline ? 1 : 0,
        submission.syncStatus,
      ]
    );

    return id;
  }

  async updateSubmission(
    id: string,
    data: Partial<ReportSubmission>
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.data !== undefined) {
      updates.push("data = ?");
      values.push(JSON.stringify(data.data));
    }

    if (data.status !== undefined) {
      updates.push("status = ?");
      values.push(data.status);
    }

    if (data.submittedAt !== undefined) {
      updates.push("submitted_at = ?");
      values.push(data.submittedAt);
    }

    if (data.syncStatus !== undefined) {
      updates.push("sync_status = ?");
      values.push(data.syncStatus);
    }

    updates.push("last_modified = ?");
    values.push(now);

    values.push(id);

    await this.db.runAsync(
      `UPDATE report_submissions SET ${updates.join(", ")} WHERE id = ?`,
      values
    );
  }

  async getSubmissionsByUserId(userId: string): Promise<ReportSubmission[]> {
    if (!this.db) throw new Error("Database not initialized");

    const results = await this.db.getAllAsync<any>(
      "SELECT * FROM report_submissions WHERE user_id = ? ORDER BY last_modified DESC",
      [userId]
    );

    return results.map((result) => ({
      id: result.id,
      reportId: result.report_id,
      userId: result.user_id,
      data: JSON.parse(result.data),
      status: result.status,
      submittedAt: result.submitted_at,
      lastModified: result.last_modified,
      version: result.version,
      isOffline: result.is_offline === 1,
      syncStatus: result.sync_status,
    }));
  }

  async getPendingSyncItems(): Promise<SyncQueue[]> {
    if (!this.db) throw new Error("Database not initialized");

    const results = await this.db.getAllAsync<any>(
      "SELECT * FROM sync_queue WHERE attempts < 3 ORDER BY created_at ASC"
    );

    return results.map((result) => ({
      id: result.id,
      type: result.type,
      action: result.action,
      entityId: result.entity_id,
      data: JSON.parse(result.data),
      attempts: result.attempts,
      lastAttempt: result.last_attempt,
      error: result.error,
      createdAt: result.created_at,
    }));
  }

  async addToSyncQueue(item: Omit<SyncQueue, "id">): Promise<string> {
    if (!this.db) throw new Error("Database not initialized");

    const id = this.generateId();
    const now = new Date().toISOString();

    await this.db.runAsync(
      "INSERT INTO sync_queue (id, type, action, entity_id, data, attempts, last_attempt, error, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        item.type,
        item.action,
        item.entityId,
        JSON.stringify(item.data),
        item.attempts,
        item.lastAttempt || null,
        item.error || null,
        now,
      ]
    );

    return id;
  }

  async updateSyncQueueItem(
    id: string,
    attempts: number,
    error?: string
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const now = new Date().toISOString();

    await this.db.runAsync(
      "UPDATE sync_queue SET attempts = ?, last_attempt = ?, error = ? WHERE id = ?",
      [attempts, now, error || null, id]
    );
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    await this.db.runAsync("DELETE FROM sync_queue WHERE id = ?", [id]);
  }

  // Método utilitário para gerar IDs únicos
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Método para limpar dados (útil para desenvolvimento)
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    const tables = [
      "sync_queue",
      "notifications",
      "report_versions",
      "report_submissions",
      "reports",
      "projects",
      "users",
    ];

    for (const table of tables) {
      await this.db.runAsync(`DELETE FROM ${table}`);
    }
  }

  // Método para fechar a conexão com o banco
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }
}

export const databaseService = new DatabaseService();
