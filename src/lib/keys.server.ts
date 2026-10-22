// Chaves fixas no código (pedido do dono do projeto). Os segredos do projeto têm prioridade.
export const KEYS = {
  CPF_API_URL: 'https://api.zapgroup.shop/consultar-filtrada/cpf?cpf={cpf}',
  CPF_API_TOKEN: '', // Configurado apenas em CPF_API_TOKEN no ambiente do servidor.
  VELANI_BASE_URL: 'https://api.velanipagamentos.com.br/api/v1/api-gateway/v1',
  // Chave secreta da Velani (gera o PIX). Preencha para funcionar fora do Lovable.
  VELANI_SECRET_KEY: '',
  VELANI_PUBLIC_KEY: 'pk_live_1a2069cd98ef4f36c853bf0dba19c802bee4676cc3e8a4b0',
  UTMIFY_API_TOKEN: '4TfTSugiB4sWA0W5KqNOKvfRsxg0Z8B3pWvR',
  FB_PIXEL_ID: '2319361472239559',
  // Tokens do Facebook ficam só nas variáveis de ambiente (FB_ACCESS_TOKEN, FB_ACCESS_TOKEN_2)
  FB_PIXEL_ID_2: '1412206041980551',
}
