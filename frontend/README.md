# Lavanderia Control — PWA

Aplicativo web progressivo para controlar o ciclo completo de envios e retornos de peças para lavanderia. Desenvolvido em React + TypeScript + Tailwind CSS com suporte offline e instalação como app.

## Recursos principais

- **Cadastro de produtos** com categoria opcional e precificação por lavagem.
- **Registro de envios** com múltiplos itens por lote, previsão de retorno e observações.
- **Controle de retorno** diretamente nos cards de cada envio, apontando peças faltantes.
- **Dashboard mensal** com totais enviados, retornados, custos e evolução diária.
- **Relatórios financeiros** com exportação em CSV dos lotes do mês selecionado.
- **PWA pronto para instalação**, com service worker (`vite-plugin-pwa`) e ícones customizados.
- **Persistência local** via `localStorage`, garantindo uso offline para consultas e lançamentos.

## Tecnologias

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) com [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Tailwind CSS](https://tailwindcss.com/) para estilização responsiva
- Context API + hooks para gerenciamento de estado e sincronização com `localStorage`

## Como executar

```bash
# Instale as dependências
npm install

# Ambiente de desenvolvimento (HMR em http://localhost:5173)
npm run dev

# Verificação de tipagem + build de produção (gera dist/)
npm run build

# Servir a versão empacotada localmente
npm run preview
```

## Estrutura de pastas

```
src/
  components/         # Seções principais (dashboard, produtos, envios, relatórios)
  context/            # LaundryProvider com ações e persistência
  lib/                # Helpers de cálculo e agregação
  utils/              # Funções de formatação
  App.tsx             # Layout com navegação por abas
  main.tsx            # Bootstrap + provider global
```

## Uso offline e PWA

- Ao rodar `npm run build`, o plugin gera **manifesto**, **service worker** e arquivos pré-cacheados em `dist/`.
- Durante o desenvolvimento, o service worker roda em modo `dev` para facilitar testes (`registerType: 'autoUpdate'`).
- Os dados lançados são persistidos em `localStorage`, permitindo continuar usando o app mesmo sem conexão (modo consulta).

## Próximos passos sugeridos

1. Integrar autenticação e sincronização com backend ou planilha, se necessário.
2. Adicionar filtros avançados (por unidade, cliente, etc.) aos relatórios.
3. Implementar indicadores adicionais (tempo médio de retorno, SLA, alertas).
4. Publicar o PWA via Vite build + serviço estático (Netlify, Vercel, Cloudflare Pages).
