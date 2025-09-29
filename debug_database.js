// Script para debugar o banco de dados
const { databaseService } = require("./src/database/database");

async function debugDatabase() {
  try {
    console.log("=== DEBUG DATABASE ===");

    // Verifica se o banco está inicializado
    if (!databaseService.isInitialized()) {
      console.log("Database not initialized, initializing...");
      await databaseService.init();
    }

    console.log("Database initialized successfully");

    // Lista todos os usuários
    const users = await databaseService.getAllUsers();
    console.log("Users:", users.length);

    // Lista todos os projetos
    const projects = await databaseService.getAllProjects();
    console.log("Projects:", projects.length);

    // Lista todos os relatórios
    const reports = await databaseService.getAllReports();
    console.log("Reports:", reports.length);

    // Para cada relatório, lista suas submissões
    for (const report of reports) {
      const submissions = await databaseService.getSubmissionsByReportId(
        report.id
      );
      console.log(
        `Report "${report.title}" has ${submissions.length} submissions`
      );
    }
  } catch (error) {
    console.error("Error debugging database:", error);
  }
}

debugDatabase();
