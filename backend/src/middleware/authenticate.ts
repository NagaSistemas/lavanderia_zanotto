import type { Request, Response, NextFunction } from 'express';
import { auth } from '../firebase.js';

const unauthorized = (res: Response) =>
  res.status(401).json({ message: 'Autenticação necessária. Envie um token válido.' });

const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  const token = authorization.slice('Bearer '.length).trim();

  try {
    const decoded = await auth.verifyIdToken(token);
    req.userId = decoded.uid;
    return next();
  } catch (error) {
    console.error('Erro ao verificar token Firebase', error);
    return unauthorized(res);
  }
};

export default authenticate;
