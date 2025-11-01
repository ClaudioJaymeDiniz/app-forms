import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ReportSubmission, Report, ExportOptions } from '../types';
import * as XLSX from 'xlsx';
import { Platform, Alert } from 'react-native';
import Constants from 'expo-constants';

// Verificação para importar apenas quando não estiver no Expo Go
let RNHTMLtoPDF: any = null;
try {
  if (!Constants.appOwnership || Constants.appOwnership !== 'expo') {
    RNHTMLtoPDF = require('react-native-html-to-pdf').default;
  }
} catch (error) {
  console.log('HTML to PDF não disponível nesta plataforma');
}

function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : JSON.stringify(value);
  const needsQuotes = /[",\n]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function sanitizeFileName(fileName: string, fallback: string = 'export.csv'): string {
  try {
    // Remove diretórios e apenas mantenha nome
    const nameOnly = fileName.split('/').pop()?.split('\\').pop() || fallback;
    // Garante extensão .csv
    const hasCsvExt = /\.csv$/i.test(nameOnly);
    const base = hasCsvExt ? nameOnly.replace(/\.csv$/i, '') : nameOnly;
    // Normaliza e remove acentos
    const normalized = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    // Substitui caracteres inválidos por '-'
    const safe = normalized
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/--+/g, '-');
    return `${safe || 'export'}.csv`;
  } catch {
    return fallback;
  }
}

export async function exportSubmissionsToCSV(
  submissions: ReportSubmission[],
  fileName: string = 'relatorios.csv'
): Promise<string> {
  const headers = [
    'submission_id',
    'report_id',
    'user_id',
    'status',
    'submitted_at',
    'last_modified',
    'version',
    'data',
  ];

  const rows = submissions.map((s) => [
    escapeCSV(s.id),
    escapeCSV(s.reportId),
    escapeCSV(s.userId),
    escapeCSV(s.status),
    escapeCSV(s.submittedAt || ''),
    escapeCSV(s.lastModified),
    escapeCSV(s.version),
    escapeCSV(s.data),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const safeName = sanitizeFileName(fileName, 'respostas.csv');
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const fileUri = `${dir}${safeName}`;
  await FileSystem.writeAsStringAsync(fileUri, csv as any);

  try {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV' });
    }
  } catch (e) {
    // No-op: em plataformas sem suporte, apenas retornamos o caminho
  }
  return fileUri;
}

export async function exportSubmissionsToPDF(
  submissions: ReportSubmission[],
  fileName: string = 'relatorios.pdf'
): Promise<string> {
  // Verificar se a biblioteca HTML to PDF está disponível
  if (!RNHTMLtoPDF) {
    Alert.alert(
      "Funcionalidade não disponível",
      "A exportação para PDF não está disponível no Expo Go. Por favor, use a exportação para Excel ou CSV como alternativa.",
      [{ text: "OK" }]
    );
    throw new Error('Exportação para PDF não disponível no Expo Go');
  }

  // Criar HTML para o PDF
  const tableRows = submissions.map(s => `
    <tr>
      <td>${s.id}</td>
      <td>${s.reportId}</td>
      <td>${s.userId}</td>
      <td>${s.status}</td>
      <td>${s.submittedAt || ''}</td>
      <td>${s.lastModified}</td>
      <td>${s.version}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Relatório de Submissões</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Relatório ID</th>
              <th>Usuário ID</th>
              <th>Status</th>
              <th>Data Submissão</th>
              <th>Última Modificação</th>
              <th>Versão</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const safeName = sanitizeFileName(fileName, 'respostas.pdf').replace('.csv', '.pdf');
  
  try {
    const options = {
      html,
      fileName: safeName.replace('.pdf', ''),
      directory: 'Documents',
    };

    const file = await RNHTMLtoPDF.convert(options);
    const fileUri = file.filePath;

    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF' });
    }
    
    return fileUri;
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
    throw new Error('Não foi possível gerar o PDF');
  }
}

export async function exportReportsToPDF(
  reports: Report[],
  fileName: string = 'reports.pdf'
): Promise<string> {
  // Verificar se a biblioteca HTML to PDF está disponível
  if (!RNHTMLtoPDF) {
    Alert.alert(
      "Funcionalidade não disponível",
      "A exportação para PDF não está disponível no Expo Go. Por favor, use a exportação para Excel ou CSV como alternativa.",
      [{ text: "OK" }]
    );
    throw new Error('Exportação para PDF não disponível no Expo Go');
  }

  // Criar HTML para o PDF
  const tableRows = reports.map(r => `
    <tr>
      <td>${r.id}</td>
      <td>${r.projectId}</td>
      <td>${r.title}</td>
      <td>${r.description || ''}</td>
      <td>${r.status}</td>
      <td>${r.createdAt}</td>
      <td>${r.updatedAt}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Relatório de Formulários</h1>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Projeto ID</th>
              <th>Título</th>
              <th>Descrição</th>
              <th>Status</th>
              <th>Data Criação</th>
              <th>Data Atualização</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const safeName = sanitizeFileName(fileName, 'reports.pdf').replace('.csv', '.pdf');
  
  try {
    const options = {
      html,
      fileName: safeName.replace('.pdf', ''),
      directory: 'Documents',
    };

    const file = await RNHTMLtoPDF.convert(options);
    const fileUri = file.filePath;

    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, { mimeType: 'application/pdf', dialogTitle: 'Exportar PDF de Relatórios' });
    }
    
    return fileUri;
  } catch (e) {
    console.error('Erro ao gerar PDF:', e);
    throw new Error('Não foi possível gerar o PDF');
  }
}

export async function exportSubmissionsToExcel(
  submissions: ReportSubmission[],
  fileName: string = 'relatorios.xlsx'
): Promise<string> {
  // Preparar dados para Excel
  const data = submissions.map(s => ({
    submission_id: s.id,
    report_id: s.reportId,
    user_id: s.userId,
    status: s.status,
    submitted_at: s.submittedAt || '',
    last_modified: s.lastModified,
    version: s.version,
  }));

  // Criar workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Submissões");

  // Converter para binário
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  
  const safeName = sanitizeFileName(fileName, 'respostas.xlsx').replace('.csv', '.xlsx');
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const fileUri = `${dir}${safeName}`;
  
  await FileSystem.writeAsStringAsync(fileUri, wbout as any);

  try {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, { 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        dialogTitle: 'Exportar Excel' 
      });
    }
  } catch (e) {
    console.error('Erro ao compartilhar Excel:', e);
  }

  return fileUri;
}

export async function exportReportsToExcel(
  reports: Report[],
  fileName: string = 'reports.xlsx'
): Promise<string> {
  // Preparar dados para Excel
  const data = reports.map(r => ({
    report_id: r.id,
    project_id: r.projectId,
    title: r.title,
    description: r.description || '',
    status: r.status,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  }));

  // Criar workbook
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatórios");

  // Converter para binário
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  
  const safeName = sanitizeFileName(fileName, 'reports.xlsx').replace('.csv', '.xlsx');
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const fileUri = `${dir}${safeName}`;
  
  // Em algumas versões, EncodingType não está tipado; omitimos para evitar erro de tipo.
  await FileSystem.writeAsStringAsync(fileUri, wbout as any);

  try {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, { 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        dialogTitle: 'Exportar Excel de Relatórios' 
      });
    }
  } catch (e) {
    console.error('Erro ao compartilhar Excel:', e);
  }

  return fileUri;
}

// Função genérica para exportar baseada no formato escolhido
export async function exportData<T extends ReportSubmission | Report>(
  data: T[],
  options: ExportOptions
): Promise<string> {
  const { format, fileName } = options;
  
  if (data.length === 0) {
    throw new Error('Não há dados para exportar');
  }
  
  // Determinar o tipo de dados (submissions ou reports)
  const isSubmissions = 'reportId' in data[0];
  
  // Verificar se o formato PDF está disponível quando solicitado
  if (format === 'pdf' && !RNHTMLtoPDF) {
    Alert.alert(
      "Funcionalidade não disponível",
      "A exportação para PDF não está disponível no Expo Go. Por favor, use a exportação para Excel ou CSV como alternativa.",
      [{ text: "OK" }]
    );
    // Fallback para Excel se PDF não estiver disponível
    return isSubmissions 
      ? exportSubmissionsToExcel(data as ReportSubmission[], fileName?.replace('.pdf', '.xlsx'))
      : exportReportsToExcel(data as Report[], fileName?.replace('.pdf', '.xlsx'));
  }
  
  switch (format) {
    case 'csv':
      return isSubmissions 
        ? exportSubmissionsToCSV(data as ReportSubmission[], fileName)
        : exportReportsToCSV(data as Report[], fileName);
    case 'pdf':
      return isSubmissions
        ? exportSubmissionsToPDF(data as ReportSubmission[], fileName?.replace('.csv', '.pdf'))
        : exportReportsToPDF(data as Report[], fileName?.replace('.csv', '.pdf'));
    case 'excel':
      return isSubmissions
        ? exportSubmissionsToExcel(data as ReportSubmission[], fileName?.replace('.csv', '.xlsx'))
        : exportReportsToExcel(data as Report[], fileName?.replace('.csv', '.xlsx'));
    default:
      throw new Error(`Formato de exportação não suportado: ${format}`);
  }
}

export async function exportReportsToCSV(
  reports: Report[],
  fileName: string = 'reports.csv'
): Promise<string> {
  const headers = [
    'report_id',
    'project_id',
    'title',
    'description',
    'status',
    'created_at',
    'updated_at',
  ];

  const rows = reports.map((r) => [
    escapeCSV(r.id),
    escapeCSV(r.projectId),
    escapeCSV(r.title),
    escapeCSV(r.description || ''),
    escapeCSV(r.status),
    escapeCSV(r.createdAt),
    escapeCSV(r.updatedAt),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const safeName = sanitizeFileName(fileName, 'reports.csv');
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory || '';
  const fileUri = `${dir}${safeName}`;
  // Omitimos encoding para compatibilidade com tipos do expo-file-system no SDK atual.
  await FileSystem.writeAsStringAsync(fileUri, csv as any);

  try {
    const available = await Sharing.isAvailableAsync();
    if (available) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar CSV de Relatórios' });
    }
  } catch (e) {
    // No-op: em plataformas sem suporte, apenas retornamos o caminho
  }

  return fileUri;
}