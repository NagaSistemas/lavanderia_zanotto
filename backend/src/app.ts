import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import productsRouter from './routes/products';
import shipmentsRouter from './routes/shipments';

const app = express();

app.use(
  cors({
    origin: '*',
  }),
);
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/products', productsRouter);
app.use('/api/shipments', shipmentsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unexpected error', err);
  res.status(500).json({ message: 'Erro interno do servidor' });
});

export default app;
