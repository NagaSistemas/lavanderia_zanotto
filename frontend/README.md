# Lavanderia Control - PWA

Interface web progressiva para gerenciamento de envios e retornos da lavanderia. O aplicativo consome a API hospedada no Railway e autentica usuarios com Firebase Auth.

## Recursos principais

- Cadastro e edicao de produtos com preco por lavagem.
- Registro de envios (multiples itens por lote) e controle de retornos.
- Dashboard mensal com totais enviados, retornados, faltantes e custos.
- Relatorios financeiros com exportacao CSV.
- PWA instalavel com suporte a acesso offline para consulta basica.

## Tecnologias

- React 19 + TypeScript
- Vite + vite-plugin-pwa
- Tailwind CSS
- Firebase Auth (cliente)
- Context API para estado global e fetch da API

## Como executar

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/
npm run preview    # testa a versao compilada
```

Configure as variaveis (arquivo `.env` ou painel da hospedagem):

```
VITE_API_BASE_URL=https://lavanderiazanotto-production.up.railway.app
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
# Opcional
VITE_FIREBASE_MEASUREMENT_ID=...
```

## Estrutura

```
src/
  components/         # Secoes de UI (dashboard, produtos, envios, relatorios, login)
  context/            # AuthProvider + LaundryProvider
  lib/                # Calculos e agregacoes
  utils/              # Funcoes de formato
  firebase.ts         # Inicializacao do SDK cliente
  App.tsx             # Composicao das telas e navegacao
```

## Consideracoes sobre PWA e offline

- O service worker gerado via `vite-plugin-pwa` permite cache de assets estaticos.
- Operacoes de escrita exigem conexao (requisicoes autenticadas ao backend). Em modo offline, a aplicacao exibe dados carregados anteriormente apenas se ainda estiverem em cache no navegador.

## Proximos passos sugeridos

1. Implementar feedback visual adicional (skeletons/graficos) durante carregamentos.
2. Adicionar testes de integracao (React Testing Library) para as principais telas.
3. Configurar deploy automatico (CI/CD) para Hostinger ou outro provedor estatico.
