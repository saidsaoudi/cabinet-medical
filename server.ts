import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import apiRouter from './src/apiRouter.ts';
dotenv.config();

import {
  readDb,
  writeDb,
  initDb,
  Appointment,
  DaySchedule,
  BlockedDate,
  DoctorConfig,
  SmsLog
} from './src/db/localDb.ts';
import { smsService } from './src/lib/sms.ts';

// Initialize local JSON DB on startup
initDb();

const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const DOCTOR_TOKEN = 'alami_doctor_token_2026';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Doctor Auth Middleware
  const requireDoctorAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split('Bearer ')[1] === DOCTOR_TOKEN) {
      next();
    } else {
      res.status(401).json({ success: false, error: 'Non autorisé : Accès médecin requis' });
    }
  };

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------
  app.use('/api', apiRouter);

  // -------------------------------------------------------------
  // VITE OR STATIC ASSETS
  // -------------------------------------------------------------
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      // Skip API routes
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve('./index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    app.use(express.static(path.resolve('./dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('./dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
