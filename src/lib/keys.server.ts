// Chaves fixas no código (pedido do dono do projeto). Os segredos do projeto têm prioridade.
export const KEYS = {
  CPF_API_URL: 'https://api.zipcardx.online/api/v1/consult/{cpf}',
  CPF_API_TOKEN: 'a13676abe925caa4ac181611b357b8224d5a6a1c4853b22fbfabef04e77b0174',
  VELANI_BASE_URL: 'https://api.velanipagamentos.com.br/api/v1/api-gateway/v1',
  // Chave secreta da Velani (gera o PIX). Preencha para funcionar fora do Lovable.
  VELANI_SECRET_KEY: '',
  VELANI_PUBLIC_KEY: 'pk_live_cfc26a59d486f8fc734b9ab724bb76997660944a4f90184e',
  UTMIFY_API_TOKEN: '4TfTSugiB4sWA0W5KqNOKvfRsxg0Z8B3pWvR',
  FB_PIXEL_ID: '2319361472239559',
  // Tokens do Facebook ficam só nas variáveis de ambiente (FB_ACCESS_TOKEN, FB_ACCESS_TOKEN_2)
  FB_PIXEL_ID_2: '1412206041980551',
}
