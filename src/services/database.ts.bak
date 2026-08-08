import * as SQLite from 'expo-sqlite';

// Abre ou cria o arquivo do banco de dados local
const db = SQLite.openDatabaseSync('analise_marcha.db');

export const initDatabase = () => {
  try {
    // Criação da tabela de Pacientes
    db.execSync(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        idade INTEGER,
        data_cadastro TEXT NOT NULL,
        observacoes TEXT
      );
    `);

    // Criação da tabela de Avaliações (conectada ao paciente por id_paciente)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS avaliacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_paciente INTEGER NOT NULL,
        angulo TEXT NOT NULL,
        data_avaliacao TEXT NOT NULL,
        video_uri TEXT,
        FOREIGN KEY (id_paciente) REFERENCES pacientes (id) ON DELETE CASCADE
      );
    `);

    console.log("Banco de dados inicializado com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados:", error);
  }
};

export default db;
