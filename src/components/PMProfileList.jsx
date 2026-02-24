import { useState } from 'react';

export default function PMProfileList({ profiles }) {
    const [filter, setFilter] = useState('');

    if (!profiles || profiles.length === 0) {
        return (
            <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No profiles extracted yet. They will appear here once the agent finds them.
            </div>
        );
    }

    const filtered = profiles.filter((p) => {
        const q = filter.toLowerCase();
        return (
            !q ||
            p.name?.toLowerCase().includes(q) ||
            p.currentDesignation?.toLowerCase().includes(q)
        );
    });

    return (
        <div>
            {/* Search filter */}
            <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', alignItems: 'center' }}>
                <input
                    type="text"
                    className="input"
                    placeholder="Filter by name or designation..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{ maxWidth: 400 }}
                />
                <span style={{ marginLeft: 'var(--space-md)', color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    Showing {filtered.length} of {profiles.length} extracted profiles
                </span>
            </div>

            {/* Clean Profile Cards Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: 'var(--space-md)',
                }}
            >
                {filtered.map((profile, idx) => (
                    <div
                        key={idx}
                        className="glass-card element-hover"
                        style={{
                            padding: 'var(--space-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            borderLeft: '4px solid var(--accent-indigo)'
                        }}
                    >
                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)', color: 'var(--text-primary)', marginBottom: 'var(--space-xs)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {profile.photoUrl ? (
                                <img src={profile.photoUrl} alt={profile.name} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--bg-card-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
                                    {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                            {profile.name}
                            {profile.linkedinUrl && (
                                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: 'var(--font-size-sm)', textDecoration: 'none' }} title="View on LinkedIn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                </a>
                            )}
                        </div>
                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {profile.currentDesignation}
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}
