import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const SHEET_ID = '1TDHBWj79saP6by70vFLPOMoUwoLMxdX19eYfD6eJXSY';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for fetching P1 (Last Updated Date)
  app.get('/api/sheet/updated', async (req, res) => {
    try {
      const apiKey = 'AIzaSyBasQBsecNqcPTHe3OjmC6QP67EyWtl5Hg';

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!P1?key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        return res.status(400).json(data);
      }

      res.json({ updatedDate: data.values?.[0]?.[0] || '' });
    } catch (error) {
      console.error('Error fetching sheet date:', error);
      res.status(500).json({ error: 'Failed to fetch updated date' });
    }
  });

  // Proxy for fetching N:P (All Data)
  app.get('/api/sheet/data', async (req, res) => {
    try {
      const apiKey = 'AIzaSyBasQBsecNqcPTHe3OjmC6QP67EyWtl5Hg';

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!N:P?key=${apiKey}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        return res.status(400).json(data);
      }

      res.json({ values: data.values || [] });
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      res.status(500).json({ error: 'Failed to fetch sheet data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();