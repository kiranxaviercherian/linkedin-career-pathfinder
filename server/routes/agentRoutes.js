// PM Career Pathfinder — API Routes
import { Router } from 'express';
import * as sessionStore from '../sessionStore.js';
import * as browserManager from '../browserManager.js';
import * as profileResearchAgent from '../agents/profileResearchAgent.js';
import * as qualificationAgent from '../agents/qualificationAgent.js';
import * as careerTrajectoryAgent from '../agents/careerTrajectoryAgent.js';

const router = Router();

// ============================================================
// Session & Browser Management
// ============================================================

router.post('/session/start', async (req, res) => {
    try {
        const { targetCompany, targetRole, maxPages, pageLoadDelay, profileVisitDelay, maxProfiles } = req.body;
        if (!targetCompany) return res.status(400).json({ error: 'targetCompany is required' });

        if (!browserManager.getLoginStatus()) {
            await browserManager.waitForLinkedInLogin();
        }

        const configOverrides = {};
        if (maxPages) configOverrides.maxPages = maxPages;
        if (pageLoadDelay) configOverrides.pageLoadDelay = pageLoadDelay;
        if (profileVisitDelay) configOverrides.profileVisitDelay = profileVisitDelay;
        if (maxProfiles) configOverrides.maxProfiles = maxProfiles;

        const session = sessionStore.createSession(targetCompany, targetRole, configOverrides);
        res.json({ sessionId: session.id, targetCompany, targetRole: session.targetRole, status: 'created' });
    } catch (err) {
        console.error('Session start error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

router.get('/session/:sessionId', (req, res) => {
    const session = sessionStore.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
});

router.get('/session/login-status', (req, res) => {
    res.json({ loggedIn: browserManager.getLoginStatus() });
});

// ============================================================
// Agent 1: PM Profile Research
// ============================================================

router.post('/agents/profile-research/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Prevent duplicate launches
    const agentStatus = session.agents.profileResearch.status;
    if (agentStatus === 'running' || agentStatus === 'complete') {
        return res.json({ status: agentStatus, agent: 'profileResearch', message: 'Already ' + agentStatus });
    }

    res.json({ status: 'started', agent: 'profileResearch' });
    profileResearchAgent.run(sessionId).catch((err) => console.error(`Agent 1 failed: ${err.message}`));
});

router.get('/agents/profile-research/:sessionId/status', (req, res) => {
    const session = sessionStore.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const agent = session.agents.profileResearch;
    res.json({ status: agent.status, progress: agent.progress, profileCount: agent.profiles.length });
});

router.get('/agents/profile-research/:sessionId/results', (req, res) => {
    const session = sessionStore.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ status: session.agents.profileResearch.status, profiles: session.agents.profileResearch.profiles });
});

// ============================================================
// Agent 2: Qualification Analysis
// ============================================================

router.post('/agents/qualification-analysis/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    try {
        const data = await qualificationAgent.run(sessionId);
        res.json({ status: 'complete', data });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/agents/qualification-analysis/:sessionId/results', (req, res) => {
    const session = sessionStore.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ status: session.agents.qualificationAnalysis.status, data: session.agents.qualificationAnalysis.data });
});

// ============================================================
// Agent 3: Career Trajectory
// ============================================================

router.post('/agents/career-trajectory/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const session = sessionStore.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // Prevent duplicate launches
    const agentStatus = session.agents.careerTrajectory.status;
    if (agentStatus === 'running' || agentStatus === 'complete') {
        return res.json({ status: agentStatus, agent: 'careerTrajectory', message: 'Already ' + agentStatus });
    }

    res.json({ status: 'started', agent: 'careerTrajectory' });
    careerTrajectoryAgent.run(sessionId).catch((err) => console.error(`Agent 3 failed: ${err.message}`));
});

router.get('/agents/career-trajectory/:sessionId/status', (req, res) => {
    const session = sessionStore.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const agent = session.agents.careerTrajectory;
    res.json({ status: agent.status, progress: agent.progress, trajectoryCount: agent.trajectories.length });
});

router.get('/agents/career-trajectory/:sessionId/results', (req, res) => {
    const session = sessionStore.getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({
        status: session.agents.careerTrajectory.status,
        trajectories: session.agents.careerTrajectory.trajectories,
        aggregateDestinations: session.agents.careerTrajectory.aggregateDestinations,
    });
});

export default router;
