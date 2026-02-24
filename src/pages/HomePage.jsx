import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
    const navigate = useNavigate();
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('Product Manager');
    const [maxPages, setMaxPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!company.trim() || !role.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetCompany: company.trim(),
                    targetRole: role.trim(),
                    maxPages,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to start session');
            }

            const { sessionId } = await res.json();
            navigate(`/dashboard/${sessionId}`);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container">
            <div className="hero">
                <h1 className="hero__title">
                    <span className="gradient-text">LinkedIn Profile</span>
                    <br />
                    Search Agent
                </h1>
                <p className="hero__subtitle">
                    Fast, automated extraction of professionals from LinkedIn search results.
                </p>

                <form className="search-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    <input
                        className="input"
                        type="text"
                        placeholder="Enter role (e.g., Product Manager)"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={loading}
                        required
                    />
                    <input
                        className="input"
                        type="text"
                        placeholder="Enter company name (e.g., Google)"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        disabled={loading}
                        required
                        id="company-search-input"
                    />

                    <button className="btn btn--primary" type="submit" disabled={loading || !company.trim() || !role.trim()} id="start-research-btn">
                        {loading ? (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                                    <circle cx="12" cy="12" r="10" opacity="0.25" />
                                    <path d="M12 2a10 10 0 0 1 10 10" />
                                </svg>
                                Connecting...
                            </>
                        ) : (
                            <>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                Start Search
                            </>
                        )}
                    </button>
                </form>

                {error && (
                    <div className="status-indicator status-indicator--error" style={{ marginBottom: 'var(--space-lg)', marginTop: 'var(--space-md)' }}>
                        ⚠️ {error}
                    </div>
                )}

                <div className="glass-card settings-panel" style={{ marginTop: 'var(--space-xl)' }}>
                    <div className="settings-panel__title">⚙️ Search Settings</div>

                    <div className="slider-group">
                        <div className="slider-group__label">
                            <span>Max Search Pages</span>
                            <span className="slider-group__value">{maxPages}</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={maxPages}
                            onChange={(e) => setMaxPages(Number(e.target.value))}
                            id="max-pages-slider"
                        />
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-lg)', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                            Extraction directly from search cards
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-indigo)' }} />
                            ~10 results per page
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

