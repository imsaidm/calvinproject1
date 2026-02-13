import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Play, List, LogOut, Send, CheckCircle, Clock, FolderOpen, Download, Loader2, AlertCircle, Film, Wifi, WifiOff, Trash2, Eye, Sparkles } from 'lucide-react';
import MusicPicker from './MusicPicker';

// API Base URL - uses env var in production, falls back to localhost for dev
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const Dashboard = ({ onLogout }) => {
    const [formData, setFormData] = useState({
        title: '',
        topic: '',
        duration: '60s',
        style: 'Documentary',
        musicTrack: ''
    });

    const [status, setStatus] = useState('idle'); // idle, submitting, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [recentVideos, setRecentVideos] = useState([]);
    const [activeJobs, setActiveJobs] = useState([]); // Jobs being tracked
    const [queueInfo, setQueueInfo] = useState({ queue: 0, processing: false, completed: 0, failed: 0, totalJobs: 0 });
    const [engineOnline, setEngineOnline] = useState(false);
    const [previewVideo, setPreviewVideo] = useState(null); // Video URL for modal preview
    const [autoFilling, setAutoFilling] = useState(false); // Auto-fill loading state

    // Fetch videos list
    const fetchVideos = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/videos`);
            if (res.ok) {
                const data = await res.json();
                setRecentVideos(data);
            }
        } catch (err) {
            console.error("Failed to fetch videos:", err);
        }
    }, []);

    // Fetch queue status
    const fetchQueue = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/queue/status`);
            if (res.ok) {
                const data = await res.json();
                setQueueInfo(data);
            }
        } catch (err) {
            console.error("Failed to fetch queue:", err);
        }
    }, []);

    // Health check
    const checkHealth = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/`, { signal: AbortSignal.timeout(5000) });
            setEngineOnline(res.ok);
        } catch {
            setEngineOnline(false);
        }
    }, []);

    // Poll active jobs for status updates
    const pollActiveJobs = useCallback(async () => {
        if (activeJobs.length === 0) return;

        const updatedJobs = await Promise.all(
            activeJobs.map(async (job) => {
                if (job.status === 'completed' || job.status === 'failed') return job;
                try {
                    const res = await fetch(`${API_BASE}/api/jobs/${job.id}`);
                    if (res.ok) return await res.json();
                    return job;
                } catch {
                    return job;
                }
            })
        );

        setActiveJobs(updatedJobs);

        // If any job just completed, refresh video list
        const justCompleted = updatedJobs.some(
            (j, i) => j.status === 'completed' && activeJobs[i]?.status !== 'completed'
        );
        if (justCompleted) fetchVideos();
    }, [activeJobs, fetchVideos]);

    // Initial fetch + polling
    useEffect(() => {
        fetchVideos();
        fetchQueue();
        checkHealth();

        const interval = setInterval(() => {
            fetchVideos();
            fetchQueue();
            checkHealth();
        }, 8000);

        return () => clearInterval(interval);
    }, [fetchVideos, fetchQueue, checkHealth]);

    // Poll active jobs more frequently
    useEffect(() => {
        if (activeJobs.length === 0 || activeJobs.every(j => j.status === 'completed' || j.status === 'failed')) return;

        const interval = setInterval(pollActiveJobs, 4000);
        return () => clearInterval(interval);
    }, [activeJobs, pollActiveJobs]);

    // Auto-fill form with AI-generated idea
    const autoFillForm = async () => {
        setAutoFilling(true);
        try {
            const res = await fetch(`${API_BASE}/api/autofill`);
            if (res.ok) {
                const idea = await res.json();
                setFormData({
                    title: idea.title || '',
                    topic: idea.topic || '',
                    duration: idea.duration || '60s',
                    style: idea.style || 'Documentary',
                    musicTrack: idea.musicTrack || ''
                });
            } else {
                const data = await res.json();
                alert(`Auto-fill failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Auto-fill failed:', err);
            alert('Auto-fill failed. Check your connection.');
        } finally {
            setAutoFilling(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('submitting');
        setErrorMessage('');

        try {
            const response = await fetch(`${API_BASE}/trigger`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && (data.status === 'success' || data.status === 'queued')) {
                setStatus('success');

                // Track the new job
                setActiveJobs(prev => [{
                    id: data.jobId,
                    title: formData.title,
                    topic: formData.topic,
                    status: 'queued',
                    createdAt: new Date().toISOString()
                }, ...prev]);

                fetchQueue();

                setTimeout(() => {
                    setStatus('idle');
                    setFormData({ title: '', topic: '', duration: '60s', style: 'Documentary', musicTrack: '' });
                }, 1500);
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } catch (err) {
            console.error(err);
            setStatus('error');
            setErrorMessage(err.message);
            setTimeout(() => setStatus('idle'), 4000);
        }
    };

    // Remove completed/failed jobs from tracker
    const dismissJob = (jobId) => {
        setActiveJobs(prev => prev.filter(j => j.id !== jobId));
    };

    // Delete a video permanently
    const deleteVideo = async (vid) => {
        const confirmMsg = `Are you sure you want to delete "${vid.title}"?\n\nThis will permanently remove the video and its voice files.`;
        if (!window.confirm(confirmMsg)) return;

        try {
            // Extract filename from the video link URL
            const filename = vid.link.split('/').pop();
            const res = await fetch(`${API_BASE}/api/videos/${encodeURIComponent(filename)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // Remove from local state immediately for snappy UX
                setRecentVideos(prev => prev.filter(v => v.id !== vid.id));
            } else {
                const data = await res.json();
                alert(`Failed to delete: ${data.error || 'Unknown error'}`);
            }
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete video. Check your connection.');
        }
    };

    // Format relative time
    const timeAgo = (timestamp) => {
        if (!timestamp) return '';
        const diff = Date.now() - new Date(timestamp).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const getJobStatusStyle = (s) => {
        switch (s) {
            case 'queued': return 'bg-blue-500/20 text-blue-300';
            case 'processing': return 'bg-amber-500/20 text-amber-300';
            case 'completed': return 'bg-green-500/20 text-green-300';
            case 'failed': return 'bg-red-500/20 text-red-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };

    const getJobIcon = (s) => {
        switch (s) {
            case 'queued': return <Clock className="w-3.5 h-3.5" />;
            case 'processing': return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
            case 'completed': return <CheckCircle className="w-3.5 h-3.5" />;
            case 'failed': return <AlertCircle className="w-3.5 h-3.5" />;
            default: return null;
        }
    };

    return (
        <div className="min-h-screen pb-12">
            {/* Navigation */}
            <nav className="glass-panel rounded-none border-x-0 border-t-0 p-4 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-600/20 rounded-lg">
                            <Film className="text-purple-400 w-6 h-6" />
                        </div>
                        <div>
                            <span className="font-bold text-lg tracking-wide">AI Video Engine</span>
                            <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full ml-2">V2.0</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Engine Status Indicator */}
                        <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${engineOnline ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {engineOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                            {engineOnline ? 'Engine Online' : 'Engine Offline'}
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-6 mt-6 space-y-8">

                {/* Active Jobs Tracker */}
                <AnimatePresence>
                    {activeJobs.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-3"
                        >
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-purple-400" />
                                Active Jobs
                            </h3>
                            {activeJobs.map((job) => (
                                <motion.div
                                    key={job.id}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="glass-panel p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${getJobStatusStyle(job.status)}`}>
                                            {getJobIcon(job.status)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{job.title}</p>
                                            <p className="text-xs text-gray-500">{job.id}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getJobStatusStyle(job.status)}`}>
                                            {job.status === 'processing' ? 'Rendering...' : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                        </span>
                                        {(job.status === 'completed' || job.status === 'failed') && (
                                            <button onClick={() => dismissJob(job.id)} className="text-gray-500 hover:text-gray-300 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Processing progress bar */}
                                    {job.status === 'processing' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500/20 rounded-b-2xl overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-amber-400 to-purple-500 animate-pulse" style={{ width: '60%' }}></div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left Column: Request Form */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="lg:col-span-2"
                    >
                        <div className="glass-panel p-6">
                            <div className="mb-6 flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <Send className="w-5 h-5 text-purple-400" />
                                        New Video Request
                                    </h2>
                                    <p className="text-gray-400 text-sm mt-1">Generate a new AI video with voiceover and subtitles.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={autoFillForm}
                                    disabled={autoFilling || !engineOnline}
                                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-all duration-300 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                    title="Let AI generate a random video idea"
                                >
                                    {autoFilling ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Thinking...</>
                                    ) : (
                                        <><Sparkles className="w-4 h-4" /> Auto Fill</>
                                    )}
                                </button>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label>Video Title</label>
                                        <input
                                            name="title"
                                            type="text"
                                            placeholder="e.g. The Future of AI"
                                            required
                                            value={formData.title}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label>Topic / Prompt</label>
                                        <textarea
                                            name="topic"
                                            rows="4"
                                            placeholder="Describe what the video should be about..."
                                            required
                                            value={formData.topic}
                                            onChange={handleChange}
                                        ></textarea>
                                    </div>

                                    <div>
                                        <label>Duration</label>
                                        <select name="duration" value={formData.duration} onChange={handleChange}>
                                            <option value="30s">30 Seconds</option>
                                            <option value="60s">60 Seconds (1 min)</option>
                                            <option value="90s">90 Seconds (1.5 min)</option>
                                            <option value="120s">120 Seconds (2 min)</option>
                                            <option value="150s">150 Seconds (2.5 min)</option>
                                            <option value="180s">180 Seconds (3 min)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label>Visual Style</label>
                                        <select name="style" value={formData.style} onChange={handleChange}>
                                            <option value="Documentary">Documentary</option>
                                            <option value="Cyberpunk">Cyberpunk / Futuristic</option>
                                            <option value="Minimalist">Minimalist / Clean</option>
                                            <option value="Cinematic">Cinematic 8k</option>
                                            <option value="ExplainLikeIm5">Animated / Cartoon</option>
                                            <option value="NatureDocs">Nature Documentary</option>
                                            <option value="TechReview">Tech Review</option>
                                            <option value="Horror">Horror / Dark</option>
                                        </select>
                                    </div>

                                    {/* Music Picker */}
                                    <MusicPicker
                                        style={formData.style}
                                        selectedTrack={formData.musicTrack}
                                        onSelectTrack={(trackId) => setFormData(prev => ({ ...prev, musicTrack: trackId }))}
                                    />
                                </div>

                                {/* Error message */}
                                <AnimatePresence>
                                    {status === 'error' && errorMessage && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2"
                                        >
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            {errorMessage}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="mt-6">
                                    <button
                                        type="submit"
                                        className={`btn-primary flex items-center justify-center gap-2 ${status === 'submitting' ? 'opacity-70' : ''}`}
                                        disabled={status === 'submitting' || !engineOnline}
                                    >
                                        {status === 'submitting' ? (
                                            <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                                        ) : status === 'success' ? (
                                            <><CheckCircle className="w-5 h-5" /> Queued!</>
                                        ) : !engineOnline ? (
                                            <><WifiOff className="w-5 h-5" /> Engine Offline</>
                                        ) : (
                                            <><Play className="w-5 h-5 fill-current" /> Generate Video</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>

                    {/* Right Column: Status & Queue */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="lg:col-span-1"
                    >
                        <div className="glass-panel p-6 h-full">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <List className="w-5 h-5 text-blue-400" />
                                System Overview
                            </h3>

                            {/* Queue Stats */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="p-3 bg-white/5 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-purple-400">{queueInfo.totalJobs}</p>
                                    <p className="text-xs text-gray-400 mt-1">Total Jobs</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-green-400">{queueInfo.completed}</p>
                                    <p className="text-xs text-gray-400 mt-1">Completed</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-amber-400">{queueInfo.queue}</p>
                                    <p className="text-xs text-gray-400 mt-1">In Queue</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg text-center">
                                    <p className="text-2xl font-bold text-red-400">{queueInfo.failed}</p>
                                    <p className="text-xs text-gray-400 mt-1">Failed</p>
                                </div>
                            </div>

                            {/* Processing Alert */}
                            {queueInfo.processing && (
                                <div className="mb-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
                                    <p className="text-xs text-amber-300">Rendering video in progress...</p>
                                </div>
                            )}

                            {/* Engine Status */}
                            <div className="p-4 bg-white/5 rounded-lg space-y-2">
                                <h4 className="text-sm font-semibold text-gray-300 mb-3">Engine Status</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <span className={`w-2 h-2 rounded-full ${engineOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    Video Engine {engineOnline ? 'Online' : 'Offline'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    AI Script (Claude)
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    TTS (WaveSpeed)
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-300">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Subtitle Sync (Whisper)
                                </div>
                            </div>

                            {/* Video Library Link */}
                            <div className="mt-4">
                                <a
                                    href={`${API_BASE}/library`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10"
                                >
                                    <FolderOpen className="w-4 h-4" />
                                    Open Full Video Library
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Generated Videos Grid */}
                <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Video className="w-5 h-5 text-purple-400" />
                        Generated Videos
                        <span className="text-xs text-gray-500 font-normal ml-1">({recentVideos.length})</span>
                    </h3>

                    {recentVideos.length === 0 ? (
                        <div className="glass-panel p-12 text-center">
                            <Film className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-500">No videos generated yet.</p>
                            <p className="text-gray-600 text-sm mt-1">Submit your first request above to get started!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {recentVideos.map((vid) => (
                                <motion.div
                                    key={vid.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass-panel overflow-hidden group hover:border-purple-500/30 transition-all"
                                >
                                    {/* Video Thumbnail / Preview */}
                                    <div
                                        className="relative aspect-video bg-black/40 cursor-pointer"
                                        onClick={() => setPreviewVideo(vid.link)}
                                    >
                                        <video
                                            src={vid.link}
                                            preload="metadata"
                                            className="w-full h-full object-cover"
                                            muted
                                            onMouseEnter={(e) => e.target.play().catch(() => { })}
                                            onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="p-3 bg-purple-500/80 rounded-full">
                                                <Play className="w-6 h-6 text-white fill-current" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Video Info */}
                                    <div className="p-4">
                                        <h4 className="font-medium text-sm truncate capitalize">{vid.title}</h4>
                                        <div className="flex justify-between items-center mt-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {timeAgo(vid.timestamp)}
                                                {vid.size && <span className="text-gray-600">• {vid.size}</span>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setPreviewVideo(vid.link)}
                                                    className="text-gray-400 hover:text-purple-400 transition-colors"
                                                    title="Preview"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <a
                                                    href={vid.link}
                                                    download
                                                    className="text-gray-400 hover:text-blue-400 transition-colors"
                                                    title="Download"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => deleteVideo(vid)}
                                                    className="text-gray-400 hover:text-red-400 transition-colors"
                                                    title="Delete video"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Video Preview Modal */}
            <AnimatePresence>
                {previewVideo && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
                        onClick={() => setPreviewVideo(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            className="max-w-4xl w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <video
                                src={previewVideo}
                                controls
                                autoPlay
                                className="w-full rounded-2xl shadow-2xl"
                            />
                            <div className="flex justify-center gap-4 mt-4">
                                <a
                                    href={previewVideo}
                                    download
                                    className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Download
                                </a>
                                <button
                                    onClick={() => setPreviewVideo(null)}
                                    className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
