import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getOrCreateSession, resetSession } from './src/engine/sessionManager';
import { processUserTurn } from './src/engine/pipeline';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Start / retrieve exploration session
  app.post('/api/explore/start', (req, res) => {
    try {
      const { sessionId } = req.body || {};
      const session = getOrCreateSession(sessionId);
      res.json({
        sessionId: session.sessionId,
        state: session.state,
        turnCount: session.turnCount,
        history: session.history,
        conceptOrientation: 'Possibilities',
        suggestedFollowUps: [
          "I'm feeling stuck between two paths",
          "I don't know what I'm naturally good at",
          "I want to explore careers with creative problem solving",
          "I'm worried about job security and stability",
        ],
      });
    } catch (err: any) {
      console.error('Error starting session:', err);
      res.status(500).json({ error: err.message || 'Failed to start session' });
    }
  });

  // Turn endpoint running the real Timely Compass pipeline
  app.post('/api/explore/turn', async (req, res) => {
    try {
      const { sessionId, message } = req.body || {};
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message string is required' });
      }

      console.log(`[API] /api/explore/turn received request (sessionId: ${sessionId || 'new'}, message: "${message.slice(0, 40)}...")`);
      const session = getOrCreateSession(sessionId);
      const result = await processUserTurn(session, message);

      console.log(`[API] /api/explore/turn completed turn ${result.turn} (state: ${result.state}, action: ${result.action})`);
      res.setHeader('Content-Type', 'application/json');
      res.json(result);
    } catch (err: any) {
      console.error('Error in /api/explore/turn:', err);
      // Fallback JSON to ensure client never encounters non-JSON or unhandled HTML response
      const session = getOrCreateSession(req.body?.sessionId);
      const cleanMsg = typeof req.body?.message === 'string' ? req.body.message : 'your thoughts';
      const fallbackResult = {
        sessionId: session.sessionId,
        turn: session.turnCount + 1,
        state: session.state || 'EXPLORING',
        action: 'ASK',
        replyText: `Reflecting on "${cleanMsg.slice(0, 50)}"... What aspect of this path feels like the most energizing starting point for you?`,
        conceptOrientation: 'Possibilities',
        suggestedFollowUps: [
          "Tell me more about low-risk experiments",
          "Focus on core values first",
          "How do I navigate uncertainty?"
        ],
      };
      res.setHeader('Content-Type', 'application/json');
      res.json(fallbackResult);
    }
  });

  // Reset exploration session
  app.post('/api/explore/reset', (req, res) => {
    try {
      const { sessionId } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }
      const session = resetSession(sessionId);
      res.json({
        sessionId: session.sessionId,
        state: session.state,
        turnCount: session.turnCount,
        history: session.history,
      });
    } catch (err: any) {
      console.error('Error resetting session:', err);
      res.status(500).json({ error: err.message || 'Failed to reset session' });
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
    console.log(`Timely Compass Engine Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
