import app from './app';

const PORT = Number.parseInt(process.env.PORT ?? '3333', 10);

app.listen(PORT, () => {
  console.log(`Lavanderia backend rodando em http://localhost:${PORT}`);
});
