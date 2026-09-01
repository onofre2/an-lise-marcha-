// Pontos anatômicos do protocolo SAPO - modo "Análise Rápida"
// Baseado em Duarte et al. (2005) - Software para Avaliação Postural
// Pontos extras (axila, cintura, mamilo, umbigo) para os índices POTSI/ATSI (Suzuki et al., 1999)

export type Vista = 'anterior' | 'posterior' | 'lateral_direita' | 'lateral_esquerda';

export interface PontoAnatomico {
  id: string;
  nome: string;
}

export const PONTOS_RAPIDA: Record<Vista, PontoAnatomico[]> = {
  anterior: [
    { id: 'trago_d', nome: 'Trago Direito' },
    { id: 'trago_e', nome: 'Trago Esquerdo' },
    { id: 'acromio_d', nome: 'Acrômio Direito' },
    { id: 'acromio_e', nome: 'Acrômio Esquerdo' },
    { id: 'mamilo_d', nome: 'Mamilo Direito' },
    { id: 'mamilo_e', nome: 'Mamilo Esquerdo' },
    { id: 'umbigo', nome: 'Umbigo' },
    { id: 'eias_d', nome: 'Espinha Ilíaca Ântero-Superior Direita' },
    { id: 'eias_e', nome: 'Espinha Ilíaca Ântero-Superior Esquerda' },
    { id: 'joelho_d', nome: 'Joelho Direito (Patela)' },
    { id: 'joelho_e', nome: 'Joelho Esquerdo (Patela)' },
    { id: 'tornozelo_d', nome: 'Maléolo Medial Direito' },
    { id: 'tornozelo_e', nome: 'Maléolo Medial Esquerdo' },
  ],
  posterior: [
    { id: 'trago_d', nome: 'Trago Direito' },
    { id: 'trago_e', nome: 'Trago Esquerdo' },
    { id: 'c7', nome: 'Processo Espinhoso C7' },
    { id: 'acromio_d', nome: 'Acrômio Direito' },
    { id: 'acromio_e', nome: 'Acrômio Esquerdo' },
    { id: 'axila_d', nome: 'Prega Axilar Direita' },
    { id: 'axila_e', nome: 'Prega Axilar Esquerda' },
    { id: 'cintura_d', nome: 'Prega da Cintura Direita' },
    { id: 'cintura_e', nome: 'Prega da Cintura Esquerda' },
    { id: 'eips_d', nome: 'Espinha Ilíaca Póstero-Superior Direita' },
    { id: 'eips_e', nome: 'Espinha Ilíaca Póstero-Superior Esquerda' },
    { id: 'joelho_d', nome: 'Joelho Direito (Poplíteo)' },
    { id: 'joelho_e', nome: 'Joelho Esquerdo (Poplíteo)' },
    { id: 'tornozelo_d', nome: 'Tornozelo Direito (Calcâneo)' },
    { id: 'tornozelo_e', nome: 'Tornozelo Esquerdo (Calcâneo)' },
  ],
  lateral_direita: [
    { id: 'trago', nome: 'Trago' },
    { id: 'acromio', nome: 'Acrômio' },
    { id: 'trocanter', nome: 'Trocânter Maior do Fêmur' },
    { id: 'joelho', nome: 'Joelho (Linha Articular)' },
    { id: 'maleolo', nome: 'Maléolo Lateral' },
  ],
  lateral_esquerda: [
    { id: 'trago', nome: 'Trago' },
    { id: 'acromio', nome: 'Acrômio' },
    { id: 'trocanter', nome: 'Trocânter Maior do Fêmur' },
    { id: 'joelho', nome: 'Joelho (Linha Articular)' },
    { id: 'maleolo', nome: 'Maléolo Lateral' },
  ],
};

// Pares de pontos que formam as linhas de referência desenhadas sobre a foto
export const SEGMENTOS_RAPIDA: Record<Vista, [string, string][]> = {
  anterior: [
    ['trago_d', 'trago_e'],
    ['acromio_d', 'acromio_e'],
    ['mamilo_d', 'mamilo_e'],
    ['eias_d', 'eias_e'],
    ['joelho_d', 'joelho_e'],
    ['tornozelo_d', 'tornozelo_e'],
  ],
  posterior: [
    ['trago_d', 'trago_e'],
    ['acromio_d', 'acromio_e'],
    ['axila_d', 'axila_e'],
    ['cintura_d', 'cintura_e'],
    ['eips_d', 'eips_e'],
    ['joelho_d', 'joelho_e'],
    ['tornozelo_d', 'tornozelo_e'],
  ],
  lateral_direita: [
    ['trago', 'acromio'],
    ['acromio', 'trocanter'],
    ['trocanter', 'joelho'],
    ['joelho', 'maleolo'],
  ],
  lateral_esquerda: [
    ['trago', 'acromio'],
    ['acromio', 'trocanter'],
    ['trocanter', 'joelho'],
    ['joelho', 'maleolo'],
  ],
};
