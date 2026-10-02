import express from 'express';
import apiRouter from '../src/apiRouter.ts';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());

app.use('/api', apiRouter);

export default app;
