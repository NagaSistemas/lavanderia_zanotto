# Lavanderia Control - Monorepo

Aplicacao composta por dois projetos independentes:

```
.
|- frontend/   # PWA em React + Vite com Firebase Auth
|- backend/    # API Express integrada ao Firebase (Firestore + Auth Admin)
```

## Requisitos

- Node.js 20 ou superior
- npm 10 ou superior

## Frontend (PWA)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ para deploy
npm run preview    # testa a versao empacotada
```

Configure um arquivo `.env` (ou variaveis na hospedagem) com:

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

O PWA utiliza Firebase Auth (email/senha) e consome a API protegida via token JWT emitido pelo Firebase.

## Backend (API Express + Firebase Admin)

```bash
cd backend
npm install
npm run dev        # http://localhost:3333
npm run build      # compila para dist/
npm start          # executa a versao compilada
```

Variaveis de ambiente obrigatorias:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (manter quebras de linha ou converter `\n` em quebras reais)
- `PORT` (opcional - Railway atribui automaticamente)

Rotas disponiveis:

- `GET /health` - status basico do servico
- `GET/POST/PUT/DELETE /api/products`
- `GET/POST/PATCH/DELETE /api/shipments`
- `PATCH /api/shipments/:id/returns` - atualiza o retorno das pecas enviadas

Todas as rotas sob `/api` exigem cabecalho `Authorization: Bearer <ID_TOKEN>` obtido via Firebase Auth. Cada documento no Firestore recebe o campo `ownerId` (UID), garantindo isolamento por usuario.

## Regras sugeridas para o Firestore

Publique regras semelhantes no console do Firestore (ajuste nomes de colecao se necessario):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /products/{productId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }

    match /shipments/{shipmentId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.ownerId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.ownerId;
    }
  }
}
```

## Scripts auxiliares

- `npm run lint` (frontend e backend) executa ESLint com regras para TypeScript.

## Proximos passos recomendados

1. Configurar pipelines de deploy continuo (CI/CD) para Railway e Hostinger.
2. Adicionar testes automatizados (unitarios e de integracao) no backend e frontend.
3. Estender o dashboard com graficos e filtros adicionais (por unidade, cliente, SLA, etc.).
