// PM Career Pathfinder — Express Server Entry Point
import express from 'express';
import cors from 'cors';
import config from './config.js';
import agentRoutes from './routes/agentRoutes.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use('/api', agentRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(config.serverPort, () => {
    console.log(`\n🚀 PM Career Pathfinder API running on http://localhost:${config.serverPort}`);
    console.log(`   Health check: http://localhost:${config.serverPort}/api/health\n`);
});
