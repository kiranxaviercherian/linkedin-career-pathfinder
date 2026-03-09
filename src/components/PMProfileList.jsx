import { useState } from 'react';

export default function PMProfileList({ profiles }) {
    const [filter, setFilter] = useState('');
    const [expandedIdx, setExpandedIdx] = useState(null);

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

    const toggleExpand = (idx) => {
        setExpandedIdx(expandedIdx === idx ? null : idx);
    };

    return (
        <div>
            {/* Search filter */}
            <div style={{ marginBottom: 'var(--space-xl)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div style={{ position: 'relative', flex: '1', maxWidth: 400 }}>
                    <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input
                        type="text"
                        className="input"
                        placeholder="Filter by name or designation..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ paddingLeft: '2.5rem' }}
                    />
                </div>
                <div className="badge badge--indigo">
                    Showing {filtered.length} of {profiles.length} extracted profiles
                </div>
            </div>

            {/* Profile Cards Grid */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: 'var(--space-lg)',
                }}
            >
                {filtered.map((profile, idx) => {
                    const isExpanded = expandedIdx === idx;
                    const hasExperience = profile.experience && profile.experience.length > 0;
                    const currentExp = profile.experience?.filter(e => e.isCurrent) || [];
                    const previousExp = profile.experience?.filter(e => !e.isCurrent) || [];

                    return (
                        <div
                            key={idx}
                            className={`glass-card modern-profile-card animate-fade-in-up ${isExpanded ? 'expanded' : ''} ${hasExperience ? 'clickable' : ''}`}
                            style={{ animationDelay: `${idx * 50}ms`, cursor: hasExperience ? 'pointer' : 'default' }}
                            onClick={() => hasExperience && toggleExpand(idx)}
                        >
                            <div className="profile-header">
                                {profile.photoUrl ? (
                                    <img src={profile.photoUrl} alt={profile.name} className="profile-avatar" />
                                ) : (
                                    <div className="profile-avatar profile-avatar--placeholder">
                                        {profile.name ? profile.name.charAt(0).toUpperCase() : '?'}
                                    </div>
                                )}
                                <div className="profile-info">
                                    <h3 className="profile-name">{profile.name}</h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                        {profile.linkedinUrl && (
                                            <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="profile-link" title="View on LinkedIn" onClick={(e) => e.stopPropagation()}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                                                LinkedIn
                                            </a>
                                        )}
                                        {hasExperience && (
                                            <span className={`expand-chevron ${isExpanded ? 'rotated' : ''}`}>
                                                ▾
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="profile-designation">
                                {profile.currentDesignation}
                            </div>

                            {/* Expandable Experience Section */}
                            {hasExperience && (
                                <div className={`profile-experience-wrapper ${isExpanded ? 'open' : ''}`}>
                                    <div className="profile-experience">
                                        {currentExp.length > 0 && (
                                            <div className="experience-group">
                                                <div className="experience-group-label">
                                                    <span className="experience-dot current"></span>
                                                    Current Experience
                                                </div>
                                                {currentExp.map((exp, eIdx) => (
                                                    <div key={eIdx} className="experience-company">
                                                        <div className="experience-company-name">{exp.company}</div>
                                                        {exp.roles.map((role, rIdx) => (
                                                            <div key={rIdx} className="experience-role">
                                                                <div className="experience-role-title">{role.title}</div>
                                                                <div className="experience-role-meta">
                                                                    {role.dateRange && <span>{role.dateRange}</span>}
                                                                    {role.duration && <span className="experience-role-duration">{role.duration}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {previousExp.length > 0 && (
                                            <div className="experience-group">
                                                <div className="experience-group-label">
                                                    <span className="experience-dot previous"></span>
                                                    Previous Experience
                                                </div>
                                                {previousExp.map((exp, eIdx) => (
                                                    <div key={eIdx} className="experience-company">
                                                        <div className="experience-company-name">{exp.company}</div>
                                                        {exp.roles.map((role, rIdx) => (
                                                            <div key={rIdx} className="experience-role">
                                                                <div className="experience-role-title">{role.title}</div>
                                                                <div className="experience-role-meta">
                                                                    {role.dateRange && <span>{role.dateRange}</span>}
                                                                    {role.duration && <span className="experience-role-duration">{role.duration}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
