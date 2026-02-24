import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook that polls an agent status endpoint until complete or error.
 */
export default function useAgentData(sessionId, agentType) {
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const intervalRef = useRef(null);

    const statusUrl = `/api/agents/${agentType}/${sessionId}/status`;
    const resultsUrl = `/api/agents/${agentType}/${sessionId}/results`;

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(statusUrl);
            if (!res.ok) throw new Error('Failed to fetch status');
            const json = await res.json();

            setStatus(json.status);
            setProgress(json.progress || 0);

            if (json.status === 'complete' || json.status === 'error') {
                // Stop polling
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }

                // Fetch full results
                if (json.status === 'complete') {
                    const resData = await fetch(resultsUrl);
                    if (resData.ok) {
                        const fullData = await resData.json();
                        setData(fullData);
                    }
                }
                if (json.status === 'error') {
                    setError('Agent encountered an error');
                }
            }
        } catch (err) {
            setError(err.message);
        }
    }, [statusUrl, resultsUrl]);

    const startPolling = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setStatus('running');
        setProgress(0);
        setError(null);
        setData(null);

        // Poll every 3 seconds
        intervalRef.current = setInterval(fetchStatus, 3000);
        // Also fetch immediately
        fetchStatus();
    }, [fetchStatus]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return {
        status,
        progress,
        data,
        error,
        isLoading: status === 'running',
        isComplete: status === 'complete',
        startPolling,
    };
}
