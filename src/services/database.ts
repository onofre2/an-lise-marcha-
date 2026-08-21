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
        data_nascimento TEXT,
        sexo TEXT,
        data_cadastro TEXT NOT NULL,
        observacoes TEXT,
        diagnostico TEXT,
        historico_medico TEXT,
        anotacoes_clinicas TEXT,
        conclusao_clinica TEXT,
        objetivos_terapeuticos TEXT,
        foto_uri TEXT
      );
    `);

    // Criação da tabela de Avaliações de Marcha (vídeo)
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

    // Criação da tabela de Avaliações Posturais (foto com pontos marcados)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS avaliacoes_posturais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_paciente INTEGER NOT NULL,
        vista TEXT NOT NULL,
        modo TEXT NOT NULL,
        data_avaliacao TEXT NOT NULL,
        foto_uri TEXT NOT NULL,
        pontos_json TEXT NOT NULL,
        medidas_json TEXT,
        imagem_final_uri TEXT,
        FOREIGN KEY (id_paciente) REFERENCES pacientes (id) ON DELETE CASCADE
      );
    `);

    // Criação da tabela de Avaliações Cervicais (ângulo do pescoço)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS avaliacoes_cervicais (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_paciente INTEGER NOT NULL,
        data_avaliacao TEXT NOT NULL,
        foto_uri TEXT NOT NULL,
        pontos_json TEXT NOT NULL,
        angulo REAL NOT NULL,
        FOREIGN KEY (id_paciente) REFERENCES pacientes (id) ON DELETE CASCADE
      );
    `);

    // Criação da tabela de Avaliações de Amplitude de Movimento (ADM)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS avaliacoes_adm (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_paciente INTEGER NOT NULL,
        movimento TEXT NOT NULL,
        data_avaliacao TEXT NOT NULL,
        foto_uri TEXT NOT NULL,
        pontos_json TEXT NOT NULL,
        angulo REAL NOT NULL,
        referencia REAL NOT NULL,
        FOREIGN KEY (id_paciente) REFERENCES pacientes (id) ON DELETE CASCADE
      );
    `);

    console.log("Banco de dados inicializado com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados:", error);
  }
};

export default db;
