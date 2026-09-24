import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import cors from 'cors';
import express from 'express';
import { loadCase } from './case/loader';
import { getProvider } from './dialogue/service';
import { api } from './routes/api';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: resolve(root, '.env') });

// Falha cedo se o caso tiver erro de referência.
const c = loadCase();

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use('/api', api);

// Em produção (npm run build), o servidor também entrega o client compilado.
const dist = resolve(root, 'client/dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (_req, res) => res.sendFile(resolve(dist, 'index.html')));
}

const port = Number(process.env.PORT) || 3404;
app.listen(port, () => {
  const p = getProvider();
  console.log(`CASO 404: servidor em http://localhost:${port}`);
  console.log(`Caso carregado: ${c.title} (${c.characters.length} personagens, ${c.evidence.length} evidências)`);
  console.log(`Diálogo: ${p.name === 'claude' ? `Claude (${p.model})` : 'Mock roteirizado (defina ANTHROPIC_API_KEY para usar o Claude)'}`);
});
