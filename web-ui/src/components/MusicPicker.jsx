import React, { useState, useEffect, useRef } from 'react';
import { Music, Play, Pause, Volume2, ShieldCheck, ShieldAlert } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

/**
 * MusicPicker - Shows available music tracks for the selected style.
 * Each track has a play/preview button and can be selected.
 */
const MusicPicker = ({ style, selectedTrack, onSelectTrack }) => {
    const [tracks, setTracks] = useState([]);
    const [playingId, setPlayingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const audioRef = useRef(null);

    // Fetch tracks when style changes
    useEffect(() => {
        const fetchTracks = async () => {
            setLoading(true);
            try {
                const res = await fetch(`${API_BASE}/api/music?style=${encodeURIComponent(style)}`);
                if (res.ok) {
                    const data = await res.json();
                    setTracks(data);
                    // Reset selection if current track isn't compatible with new style
                    if (data.length > 0) {
                        const currentTrackValid = selectedTrack && data.some(t => t.id === selectedTrack && t.available !== false);
                        if (!currentTrackValid) {
                            // Auto-select first available track
                            const firstAvailable = data.find(t => t.available !== false);
                            if (firstAvailable) {
                                onSelectTrack(firstAvailable.id);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('Failed to fetch music:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTracks();
        // Stop playback on style change
        stopPlayback();
    }, [style]);

    const stopPlayback = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }
        setPlayingId(null);
    };

    const togglePlay = (trackId) => {
        if (playingId === trackId) {
            stopPlayback();
            return;
        }

        stopPlayback();

        const audio = new Audio(`${API_BASE}/api/music/preview/${trackId}`);
        audioRef.current = audio;
        audio.volume = 0.5;
        audio.play().catch(err => console.error('Playback error:', err));
        audio.addEventListener('ended', () => setPlayingId(null));
        setPlayingId(trackId);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => stopPlayback();
    }, []);

    if (loading) {
        return (
            <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: '14px' }}>
                Loading music...
            </div>
        );
    }

    if (tracks.length === 0) return null;

    return (
        <div style={{ marginTop: '12px' }}>
            <label style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '14px', color: '#d1d5db', marginBottom: '8px'
            }}>
                <Music style={{ width: '14px', height: '14px', color: '#a78bfa' }} />
                Background Music
            </label>
            <div style={{
                display: 'flex', flexDirection: 'column', gap: '6px'
            }}>
                {tracks.map(track => {
                    const isSelected = selectedTrack === track.id;
                    const isPlaying = playingId === track.id;

                    const isUnavailable = track.available === false;

                    return (
                        <div
                            key={track.id}
                            onClick={() => !isUnavailable && onSelectTrack(track.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                cursor: isUnavailable ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                opacity: isUnavailable ? 0.4 : 1,
                                background: isSelected
                                    ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.25), rgba(59, 130, 246, 0.15))'
                                    : 'rgba(255,255,255,0.03)',
                                border: isSelected
                                    ? '1px solid rgba(124, 58, 237, 0.5)'
                                    : '1px solid rgba(255,255,255,0.06)',
                            }}
                        >
                            {/* Play/Pause Button */}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); if (!isUnavailable) togglePlay(track.id); }}
                                disabled={isUnavailable}
                                style={{
                                    width: '32px', height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isPlaying
                                        ? 'linear-gradient(135deg, #7c3aed, #3b82f6)'
                                        : 'rgba(255,255,255,0.08)',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'white',
                                    transition: 'all 0.2s ease',
                                    flexShrink: 0
                                }}
                                title={isPlaying ? 'Pause' : 'Preview track'}
                            >
                                {isPlaying ? (
                                    <Pause style={{ width: '14px', height: '14px' }} />
                                ) : (
                                    <Play style={{ width: '14px', height: '14px', marginLeft: '2px' }} />
                                )}
                            </button>

                            {/* Track Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    fontSize: '13px',
                                    fontWeight: isSelected ? 600 : 400,
                                    color: isSelected ? '#e2e8f0' : '#9ca3af',
                                }}>
                                    <span style={{
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>{track.name}</span>
                                    {track.copyrightSafe ? (
                                        <ShieldCheck
                                            style={{ width: '13px', height: '13px', color: '#22c55e', flexShrink: 0 }}
                                            title={`✅ Copyright Safe — ${track.license || 'Royalty-Free'}`}
                                        />
                                    ) : (
                                        <ShieldAlert
                                            style={{ width: '13px', height: '13px', color: '#f59e0b', flexShrink: 0 }}
                                            title="⚠️ Copyright status unverified"
                                        />
                                    )}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: '#6b7280',
                                    marginTop: '2px'
                                }}>
                                    {isUnavailable
                                        ? <span style={{ color: '#ef4444' }}>Not downloaded</span>
                                        : <>{track.mood} · {track.bpm}{track.source ? ` · ${track.source}` : ''}</>}
                                </div>
                            </div>

                            {/* Selected Indicator */}
                            {isSelected && (
                                <Volume2 style={{
                                    width: '16px', height: '16px',
                                    color: '#a78bfa', flexShrink: 0
                                }} />
                            )}

                            {/* Playing animation */}
                            {isPlaying && (
                                <div style={{
                                    display: 'flex', gap: '2px', alignItems: 'flex-end',
                                    height: '16px', flexShrink: 0
                                }}>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} style={{
                                            width: '3px',
                                            backgroundColor: '#7c3aed',
                                            borderRadius: '1px',
                                            animation: `musicBar 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                                        }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* CSS animation for music bars */}
            <style>{`
                @keyframes musicBar {
                    0% { height: 4px; }
                    100% { height: 16px; }
                }
            `}</style>
        </div>
    );
};

export default MusicPicker;
