import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import db from '../services/database';

export type Idioma = 'pt' | 'en';

// Dicionario enxuto: so o que esta efetivamente ligado na interface. Nomes de
// pontos, rotulos de medida e achados ficam de fora de proposito, porque estao
// gravados nas avaliacoes e traduzi-los quebraria exames ja salvos.
const TEXTOS: Record<string, { pt: string; en: string }> = {
  'aba.historico': { pt: 'Histórico', en: 'Patients' },
  'aba.postural': { pt: 'Postural', en: 'Posture' },
  'aba.cervical': { pt: 'Cervical', en: 'Cervical' },
  'aba.adm': { pt: 'ADM', en: 'ROM' },
  'aba.joelhos': { pt: 'Joelhos', en: 'Knees' },
  'aba.marcha': { pt: 'Marcha', en: 'Gait' },
  'aba.adams': { pt: 'Adams', en: 'Adams' },
  'aba.config': { pt: 'Config', en: 'Settings' },
  'config.aparencia': { pt: 'Aparencia', en: 'Appearance' },
  'config.claro': { pt: 'Claro', en: 'Light' },
  'config.escuro': { pt: 'Escuro', en: 'Dark' },
  'config.idioma': { pt: 'Idioma', en: 'Language' },
  'config.portugues': { pt: 'Portugues', en: 'Portuguese' },
  'config.ingles': { pt: 'Ingles', en: 'English' },
};

type Ctx = { idioma: Idioma; definirIdioma: (i: Idioma) => void; t: (chave: string) => string };
const IdiomaContext = createContext<Ctx>({ idioma: 'pt', definirIdioma: () => {}, t: (c) => c });

function garantirColuna() {
  try { db.execSync("ALTER TABLE configuracoes_terapeuta ADD COLUMN idioma TEXT DEFAULT 'pt'"); } catch {}
}

export function IdiomaProvider({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>('pt');

  useEffect(() => {
    garantirColuna();
    try {
      const linha = db.getFirstSync('SELECT idioma FROM configuracoes_terapeuta WHERE id = 1') as { idioma?: string } | null;
      if (linha && linha.idioma === 'en') setIdioma('en');
    } catch {}
  }, []);

  const definirIdioma = (novo: Idioma) => {
    setIdioma(novo);
    try {
      db.runSync("INSERT OR IGNORE INTO configuracoes_terapeuta (id, nome, registro) VALUES (1, '', '')");
      db.runSync('UPDATE configuracoes_terapeuta SET idioma = ? WHERE id = 1', [novo]);
    } catch (e) {
      console.error('Erro ao salvar idioma:', e);
    }
  };

  const valor = useMemo(() => ({
    idioma,
    definirIdioma,
    t: (chave: string) => (TEXTOS[chave] ? TEXTOS[chave][idioma] : chave),
  }), [idioma]);

  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>;
}

export function useIdioma() {
  return useContext(IdiomaContext);
}
