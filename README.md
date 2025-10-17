# Lavanderia Control — Monorepo

Este repositório mantém o PWA de controle de lavanderia e uma API Node/Express separadas em pastas distintas.

```
.
├── frontend/   # Aplicação React + Vite (PWA)
└── backend/    # API Express com armazenamento em memória
```

## Requisitos

- Node.js 20+
- npm 10+

## Como rodar

### Frontend (PWA)

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm run build      # gera dist/ com assets do PWA
npm run preview    # testa build localmente
```

### Backend (API Express)

```bash
cd backend
npm install
npm run dev        # http://localhost:3333
npm run build      # output em dist/
npm start          # executa versão compilada
```

A API expõe:

- `GET /health` — status do serviço
- `GET/POST/PUT/DELETE /api/products`
- `GET/POST/PATCH/DELETE /api/shipments`
- `PATCH /api/shipments/:id/returns` para atualizar retornos de itens

## Scripts auxiliares

- `npm run lint` (em cada projeto) executa ESLint focado em TypeScript.

## Próximos passos sugeridos

1. Substituir o armazenamento em memória por banco de dados (PostgreSQL, MongoDB etc.).
2. Implementar autenticação e controle de acesso na API.
3. Integrar o frontend à API usando uma camada de serviços dedicada (ex.: React Query).
