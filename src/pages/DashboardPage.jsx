import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import useAgentData from '../hooks/useAgentData';
import PMProfileList from '../components/PMProfileList';

export default function DashboardPage() {
    const { sessionId } = useParams();
    const [session, setSession] = useState(null);

    // Guard to prevent duplicate agent launches (React StrictMode fires effects twice)
    const agent1LaunchedRef = useRef(false);

    // Hook to poll agent status
    const agent1 = useAgentData(sessionId, 'profile-research');

    // Fetch session info
    useEffect(() => {
        fetch(`/api/session/${sessionId}`)
            .then((r) => r.json())
            .then(setSession)
            .catch(console.error);
    }, [sessionId]);

    // Start Agent 1 on mount — ONLY ONCE
    useEffect(() => {
        if (agent1LaunchedRef.current) return;
        agent1LaunchedRef.current = true;

        fetch(`/api/agents/profile-research/${sessionId}`, { method: 'POST' })
            .then(() => agent1.startPolling())
            .catch(console.error);
    }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="container">
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <Link to="/" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
                        ← Back to Search
                    </Link>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
                        <span className="gradient-text">{session ? `${session.targetRole}s @ ${session.targetCompany}` : '...'}</span>
                    </h1>
                </div>
            </div>

            {/* Overview Tiles */}
            <div className="tiles-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                <div className="glass-card tile">
                    <div className="tile__label">Profiles Extracted</div>
                    <div className="tile__value gradient-text">{agent1.data?.profiles?.length ?? '—'}</div>
                </div>
                <div className="glass-card tile">
                    <div className="tile__label">Scraper Status</div>
                    <div className="tile__value" style={{ fontSize: 'var(--font-size-lg)', marginTop: 'var(--space-xs)' }}>
                        <AgentStatusBadge status={agent1.status} progress={agent1.progress} />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div style={{ marginTop: 'var(--space-2xl)' }}>
                {agent1.isLoading && (
                    <div>
                        <div className="status-indicator status-indicator--running" style={{ marginBottom: 'var(--space-lg)' }}>
                            🤖 Agent is searching and extracting profiles...
                        </div>
                        <div className="progress-bar" style={{ marginBottom: 'var(--space-xl)' }}>
                            <div className="progress-bar__fill" style={{ width: `${agent1.progress}%` }} />
                        </div>
                    </div>
                )}

                {agent1.data?.profiles && <PMProfileList profiles={agent1.data.profiles} />}

                {agent1.error && (
                    <div className="status-indicator status-indicator--error" style={{ marginTop: 'var(--space-md)' }}>
                        ⚠️ Error: {agent1.error}
                    </div>
                )}
            </div>
        </div>
    );
}

function AgentStatusBadge({ status, progress }) {
    if (status === 'running') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>⏳</span>
                <span style={{ color: 'var(--text-primary)' }}>Running ({progress}%)</span>
            </div>
        );
    }
    if (status === 'complete') return <div style={{ color: 'var(--accent-emerald)' }}>✅ Complete</div>;
    if (status === 'error') return <div style={{ color: 'var(--accent-rose)' }}>❌ Error</div>;
    return <div style={{ color: 'var(--text-muted)' }}>Idle</div>;
}
