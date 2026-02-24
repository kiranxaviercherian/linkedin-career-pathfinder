// PM Career Pathfinder — In-Memory Session Store
import { v4 as uuidv4 } from 'uuid';

// Map<sessionId, SessionData>
const sessions = new Map();

export function createSession(targetCompany, targetRole = 'Product Manager', configOverrides = {}) {
    const id = uuidv4();
    const session = {
        id,
        targetCompany,
        targetRole,
        config: { ...configOverrides },
        createdAt: new Date().toISOString(),
        agents: {
            profileResearch: { status: 'idle', progress: 0, profiles: [] },
            qualificationAnalysis: { status: 'idle', data: null },
            careerTrajectory: { status: 'idle', progress: 0, trajectories: [], aggregateDestinations: [] },
        },
    };
    sessions.set(id, session);
    return session;
}

export function getSession(id) {
    return sessions.get(id) || null;
}

export function addProfiles(sessionId, profiles) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.agents.profileResearch.profiles.push(...profiles);
    return session;
}

export function addTrajectories(sessionId, trajectories) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.agents.careerTrajectory.trajectories.push(...trajectories);
    return session;
}

export function setAggregateDestinations(sessionId, destinations) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.agents.careerTrajectory.aggregateDestinations = destinations;
    return session;
}

export function setQualificationData(sessionId, data) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    session.agents.qualificationAnalysis.data = data;
    return session;
}

export function updateAgentStatus(sessionId, agentName, status, progress = null) {
    const session = sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (!session.agents[agentName]) throw new Error(`Agent ${agentName} not found`);
    session.agents[agentName].status = status;
    if (progress !== null) {
        session.agents[agentName].progress = progress;
    }
    return session;
}
