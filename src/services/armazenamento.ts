// Copia fotos e videos capturados para a pasta permanente do app.
// Sem isso, o Android pode limpar os arquivos do cache e as avaliacoes
// antigas perdem a imagem.

import { Directory, File, Paths } from 'expo-file-system';

const NOME_PASTA = 'avaliacoes';

function pastaMidia(): Directory {
  return new Directory(Paths.document, NOME_PASTA);
}

/**
 * Copia o arquivo para a pasta permanente do app e devolve o novo caminho.
 * Se algo falhar, devolve o caminho original para nao bloquear o salvamento.
 */
export async function salvarMidiaPermanente(uri: string): Promise<string> {
  try {
    if (!uri) return uri;

    const pasta = pastaMidia();

    // Se ja esta na pasta permanente, nao copia de novo
    if (uri.startsWith(pasta.uri)) return uri;

    if (!pasta.exists) {
      pasta.create({ intermediates: true });
    }

    const origem = new File(uri);
    if (!origem.exists) return uri;

    const extensao = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const nome = `${Date.now()}_${Math.floor(Math.random() * 10000)}.${extensao}`;
    const destino = new File(pasta, nome);

    await origem.copy(destino);
    return destino.uri;
  } catch (erro) {
    console.error('Erro ao copiar midia para pasta permanente:', erro);
    return uri;
  }
}
