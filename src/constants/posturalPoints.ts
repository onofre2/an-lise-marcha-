// Pontos anatômicos do protocolo SAPO - modo "Análise Rápida"
// Baseado em Duarte et al. (2005) - Software para Avaliação Postural

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
    { id: 'eias_d', nome: 'Espinha Ilíaca Ântero-Superior Direita' },
    { id: 'eias_e', nome: 'Espinha Ilíaca Ântero-Superior Esquerda' },
  ],
  posterior: [
    { id: 'trago_d', nome: 'Trago Direito' },
    { id: 'trago_e', nome: 'Trago Esquerdo' },
    { id: 'c7', nome: 'Processo Espinhoso C7' },
    { id: 'acromio_d', nome: 'Acrômio Direito' },
    { id: 'acromio_e', nome: 'Acrômio Esquerdo' },
    { id: 'eips_d', nome: 'Espinha Ilíaca Póstero-Superior Direita' },
    { id: 'eips_e', nome: 'Espinha Ilíaca Póstero-Superior Esquerda' },
  ],
  lateral_direita: [
    { id: 'trago', nome: 'Trago' },
    { id: 'acromio', nome: 'Acrômio' },
    { id: 'trocanter', nome: 'Trocânter Maior do Fêmur' },
    { id: 'maleolo', nome: 'Maléolo Lateral' },
  ],
  lateral_esquerda: [
    { id: 'trago', nome: 'Trago' },
    { id: 'acromio', nome: 'Acrômio' },
    { id: 'trocanter', nome: 'Trocânter Maior do Fêmur' },
    { id: 'maleolo', nome: 'Maléolo Lateral' },
  ],
};

// Pares de pontos que formam as linhas de referência desenhadas sobre a foto
export const SEGMENTOS_RAPIDA: Record<Vista, [string, string][]> = {
  anterior: [
    ['trago_d', 'trago_e'],
    ['acromio_d', 'acromio_e'],
    ['eias_d', 'eias_e'],
  ],
  posterior: [
    ['trago_d', 'trago_e'],
    ['acromio_d', 'acromio_e'],
    ['eips_d', 'eips_e'],
  ],
  lateral_direita: [
    ['trago', 'acromio'],
    ['acromio', 'trocanter'],
    ['trocanter', 'maleolo'],
  ],
  lateral_esquerda: [
    ['trago', 'acromio'],
    ['acromio', 'trocanter'],
    ['trocanter', 'maleolo'],
  ],
};
