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

    // Migracao: adiciona coluna de observacoes visuais (circulos vermelhos) nas avaliacoes
    const tabelasObservacoes = ['avaliacoes_posturais', 'avaliacoes_cervicais', 'avaliacoes_adm'];
    tabelasObservacoes.forEach(tabela => {
      try {
        db.execSync(`ALTER TABLE ${tabela} ADD COLUMN observacoes_json TEXT`);
      } catch {
        // coluna ja existe - ignora
      }
      // Dimensoes da area onde os pontos foram marcados.
      // Necessario para reproduzir a imagem com fidelidade no PDF.
      try {
        db.execSync(`ALTER TABLE ${tabela} ADD COLUMN dimensoes_json TEXT`);
      } catch {
        // coluna ja existe - ignora
      }
    });

    // Migracao: adiciona coluna de marcacoes por fase na tabela de marcha (bancos antigos)
    try {
      db.execSync('ALTER TABLE avaliacoes ADD COLUMN marcacoes_json TEXT');
    } catch {
      // coluna ja existe - ignora
    }

    // Frames capturados de cada fase da marcha, com as marcacoes sobrepostas
    try {
      db.execSync('ALTER TABLE avaliacoes ADD COLUMN frames_json TEXT');
    } catch {
      // coluna ja existe - ignora
    }

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

    // Criacao da tabela de configuracoes do terapeuta (registro unico)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS configuracoes_terapeuta (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nome TEXT,
        registro TEXT,
        logo_uri TEXT,
        assinatura_uri TEXT
      );
    `);

    console.log("Banco de dados inicializado com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar o banco de dados:", error);
  }
};

export default db;
