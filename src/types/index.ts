// Tipos de dados para o aplicativo de relatórios

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  allowOffline: boolean;
}

export interface Report {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  fields: ReportField[];
  permissions: ReportPermissions;
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ReportField {
  id: string;
  type: 'text' | 'textarea' | 'checkbox' | 'select' | 'file' | 'image';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // Para campos select
  validation?: FieldValidation;
  order: number;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  fileTypes?: string[]; // Para campos de arquivo
  maxFileSize?: number; // Em bytes
}

export interface ReportPermissions {
  canFill: string[]; // IDs dos usuários que podem preencher
  canEdit: string[]; // IDs dos usuários que podem editar
  canView: string[]; // IDs dos usuários que podem visualizar
  canConsolidate: string[]; // IDs dos usuários que podem consolidar
}

export interface ReportSubmission {
  id: string;
  reportId: string;
  userId: string;
  data: Record<string, any>; // Dados preenchidos pelo usuário
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  lastModified: string;
  version: number;
  isOffline: boolean; // Indica se foi criado offline
  syncStatus: 'synced' | 'pending' | 'error';
}

export interface ReportVersion {
  id: string;
  submissionId: string;
  version: number;
  data: Record<string, any>;
  changedBy: string;
  changedAt: string;
  changes: string; // Descrição das mudanças
}

export interface Notification {
  id: string;
  userId: string;
  type: 'report_available' | 'deadline_approaching' | 'new_result' | 'report_approved' | 'report_rejected';
  title: string;
  message: string;
  data?: Record<string, any>; // Dados adicionais específicos do tipo
  read: boolean;
  createdAt: string;
}

export interface SyncQueue {
  id: string;
  type: 'submission' | 'report' | 'user' | 'project';
  action: 'create' | 'update' | 'delete';
  entityId: string;
  data: Record<string, any>;
  attempts: number;
  lastAttempt?: string;
  error?: string;
  createdAt: string;
}

// Tipos para autenticação
export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

// Tipos para filtros e busca
export interface ReportFilter {
  status?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  assignedTo?: string[];
  projectId?: string;
  searchTerm?: string;
}

export interface DashboardStats {
  totalReports: number;
  pendingReports: number;
  completedReports: number;
  overdueReports: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'submission' | 'approval' | 'rejection' | 'creation';
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
}

// Tipos para exportação
export interface ExportOptions {
  format: 'pdf' | 'excel';
  reportIds: string[];
  includeCharts: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

