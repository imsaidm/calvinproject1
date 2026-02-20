import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const VIDEO_API_KEY = process.env.VIDEO_API_KEY || '';

// Simple file logger
const logFile = path.join(process.cwd(), 'server.log');
function log(msg: string) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(msg);
}

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Trust proxy (behind nginx reverse proxy) — fixes rate limiter X-Forwarded-For warning
app.set('trust proxy', 1);

// Helmet — standard security headers (XSS, clickjacking, MIME sniffing)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow video/image serving
    contentSecurityPolicy: false // Don't break video streaming
}));

// CORS — restrict to allowed origins
const allowedOrigins = [
    'https://promovideohub.com',
    'https://www.promovideohub.com',
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.CORS_ORIGIN
].filter(Boolean) as string[];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (curl, server-to-server, same-origin)
        if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
            callback(null, true);
        } else {
            log(`CORS blocked: ${origin}`);
            callback(new Error('CORS policy: Origin not allowed'));
        }
    },
    credentials: true
}));

// Rate limiting — general (100 req / 15 min)
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false
});
app.use(generalLimiter);

// Rate limiting — video generation (5 req / 15 min)
const triggerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Video generation rate limit exceeded. Max 5 per 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false
});

// Rate limiting — auto-fill (20 req / 15 min)
const autofillLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Auto-fill rate limit exceeded. Max 20 per 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false
});

// API Key authentication middleware
function requireApiKey(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!VIDEO_API_KEY) {
        // If no API key configured, allow all (dev mode)
        return next();
    }

    const apiKey = req.headers['x-api-key'] as string
        || (req.headers['authorization'] as string || '').replace('Bearer ', '');

    if (!apiKey || apiKey !== VIDEO_API_KEY) {
        log(`AUTH DENIED: ${req.method} ${req.path} from ${req.ip}`);
        res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
        return;
    }
    next();
}

// ============================================================
// STATIC FILE SERVING
// ============================================================

// Serve the 'out' directory where videos are rendered
const outDir = path.join(process.cwd(), 'out');
app.use('/videos', express.static(outDir));

// Serve the 'public' directory where voiceover audio files are stored
const publicDir = path.join(process.cwd(), 'public');
app.use('/audio', express.static(publicDir));

app.use(express.json());

// ============================================================
// JOB QUEUE SYSTEM - Handles multiple concurrent users
// ============================================================

interface VideoJob {
    id: string;
    title: string;
    topic: string;
    style: string;
    duration: string;
    musicTrack?: string;
    status: 'queued' | 'processing' | 'completed' | 'failed';
    createdAt: Date;
    completedAt?: Date;
    videoUrl?: string;
    error?: string;
}

const jobQueue: VideoJob[] = [];
let isProcessing = false;

function generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

async function processQueue() {
    if (isProcessing) return;

    const nextJob = jobQueue.find(j => j.status === 'queued');
    if (!nextJob) return;

    isProcessing = true;
    nextJob.status = 'processing';
    log(`Processing job: ${nextJob.id} - "${nextJob.title}"`);

    try {
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);
        const MAX_BUFFER = 1024 * 1024 * 10; // 10MB

        // Sanitize inputs to prevent command injection
        const cmdTitle = nextJob.title.replace(/[^a-zA-Z0-9 _\-.,!?]/g, '');
        const cmdTopic = nextJob.topic.replace(/[^a-zA-Z0-9 _\-.,!?'()]/g, '');
        const cmdStyle = nextJob.style.replace(/[^a-zA-Z0-9 ]/g, '') || 'Documentary';
        const cmdDuration = (nextJob.duration || '30s').replace(/[^0-9s]/g, '');
        const cmdMusic = (nextJob.musicTrack || '').replace(/[^a-zA-Z0-9_\-.]/g, '');

        let cmd = `npm run orchestrate -- --title "${cmdTitle}" --topic "${cmdTopic}" --style "${cmdStyle}" --duration "${cmdDuration}"`;
        if (cmdMusic) {
            cmd += ` --musicTrack "${cmdMusic}"`;
        }

        log(`Executing: ${cmd}`);
        const { stdout, stderr } = await execPromise(cmd, { maxBuffer: MAX_BUFFER });

        log(`Job ${nextJob.id} completed`);
        if (stderr) log(`Stderr: ${stderr}`);

        const safeTitle = nextJob.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

        nextJob.status = 'completed';
        nextJob.completedAt = new Date();
        nextJob.videoUrl = `${baseUrl}/videos/${safeTitle}.mp4`;

    } catch (error: any) {
        log(`Job ${nextJob.id} failed: ${error.message}`);
        nextJob.status = 'failed';
        nextJob.completedAt = new Date();
        nextJob.error = error.message;
    } finally {
        isProcessing = false;
        // Process next job in queue
        processQueue();
    }
}

// ============================================================
// API ENDPOINTS
// ============================================================

// List all generated videos (with file size)
app.get('/api/videos', (req, res) => {
    try {
        if (!fs.existsSync(outDir)) {
            res.json([]);
            return;
        }
        const files = fs.readdirSync(outDir).filter((file: string) => file.endsWith('.mp4'));
        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

        const videos = files.map((file: string, index: number) => {
            const stats = fs.statSync(path.join(outDir, file));
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
            const baseName = file.replace('.mp4', '');

            // Check for associated YouTube-ready files
            const metadataFile = `${baseName}_metadata.json`;
            const scriptFile = `${baseName}_script.txt`;
            const thumbnailFile = `${baseName}_thumbnail.jpg`;

            const hasMetadata = fs.existsSync(path.join(outDir, metadataFile));
            const hasScript = fs.existsSync(path.join(outDir, scriptFile));
            const hasThumbnail = fs.existsSync(path.join(outDir, thumbnailFile));

            return {
                id: index,
                title: baseName.replace(/_/g, ' '),
                status: 'Ready',
                link: `${baseUrl}/videos/${file}`,
                timestamp: stats.mtime,
                size: `${sizeMB} MB`,
                metadataUrl: hasMetadata ? `${baseUrl}/videos/${metadataFile}` : null,
                scriptUrl: hasScript ? `${baseUrl}/videos/${scriptFile}` : null,
                thumbnailUrl: hasThumbnail ? `${baseUrl}/videos/${thumbnailFile}` : null
            };
        }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json(videos);
    } catch (error) {
        log(`Error listing videos: ${error}`);
        res.status(500).json({ error: "Failed to list videos" });
    }
});

// Trigger video generation (queued) — PROTECTED
app.post('/trigger', triggerLimiter, requireApiKey, async (req, res) => {
    const { title, topic, style, duration, musicTrack } = req.body;

    if (!title || !topic) {
        res.status(400).json({ error: "Missing title or topic" });
        return;
    }

    const job: VideoJob = {
        id: generateJobId(),
        title,
        topic,
        style: style || 'Documentary',
        duration: duration || '30s',
        musicTrack: musicTrack || '',
        status: 'queued',
        createdAt: new Date()
    };

    jobQueue.push(job);
    log(`Job queued: ${job.id} - "${title}"`);

    // Start processing if idle
    processQueue();

    res.json({
        status: 'queued',
        jobId: job.id,
        message: `Video "${title}" has been queued for generation.`,
        position: jobQueue.filter(j => j.status === 'queued').length
    });
});

// Get queue status
app.get('/api/queue/status', (req, res) => {
    const queued = jobQueue.filter(j => j.status === 'queued').length;
    const processing = jobQueue.some(j => j.status === 'processing');
    const completed = jobQueue.filter(j => j.status === 'completed').length;
    const failed = jobQueue.filter(j => j.status === 'failed').length;

    res.json({
        queue: queued,
        processing,
        completed,
        failed,
        totalJobs: jobQueue.length
    });
});

// Get specific job status
app.get('/api/jobs/:jobId', (req, res) => {
    const job = jobQueue.find(j => j.id === req.params.jobId);
    if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
    }
    res.json(job);
});

// List all jobs (recent first)
app.get('/api/jobs', (req, res) => {
    const jobs = [...jobQueue].reverse().slice(0, 50); // Last 50 jobs
    res.json(jobs);
});

// Delete a video permanently — PROTECTED
app.delete('/api/videos/:filename', requireApiKey, (req, res) => {
    try {
        const filename = req.params.filename;

        // Sanitize: only allow alphanumeric, underscores, hyphens, dots
        if (!/^[a-zA-Z0-9_\-. ]+\.mp4$/.test(filename)) {
            res.status(400).json({ error: 'Invalid filename' });
            return;
        }

        const videoPath = path.join(outDir, filename);
        if (!fs.existsSync(videoPath)) {
            res.status(404).json({ error: 'Video not found' });
            return;
        }

        // Delete the video file
        fs.unlinkSync(videoPath);
        log(`Deleted video: ${filename}`);

        // Also delete matching voice files from public/
        const baseName = filename.replace('.mp4', '');
        try {
            const publicFiles = fs.readdirSync(publicDir);
            // Match voice files: voice-<baseName>.wav/.mp3 or voiceover-<baseName>.wav/.mp3
            const voiceFiles = publicFiles.filter((f: string) => {
                const lower = f.toLowerCase();
                const baseCheck = baseName.toLowerCase();
                return (lower.includes(baseCheck) || lower.includes(baseCheck.replace(/_/g, '-')))
                    && (lower.endsWith('.wav') || lower.endsWith('.mp3'));
            });
            for (const vf of voiceFiles) {
                fs.unlinkSync(path.join(publicDir, vf));
                log(`Deleted voice file: ${vf}`);
            }
        } catch (e) {
            log(`Non-critical: could not clean voice files for ${baseName}`);
        }

        res.json({ success: true, message: `Deleted ${filename}` });
    } catch (error: any) {
        log(`Error deleting video: ${error.message}`);
        res.status(500).json({ error: 'Failed to delete video' });
    }
});

// Auto-fill form with AI-generated video idea
// Supports ?niche=ai (default), ?niche=science, ?niche=any, etc.
app.get('/api/autofill', autofillLimiter, async (req, res) => {
    try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;

        if (!process.env.ANTHROPIC_API_KEY) {
            res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
            return;
        }

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const styles = ['Documentary', 'Cyberpunk', 'Minimalist', 'Cinematic', 'ExplainLikeIm5', 'NatureDocs', 'TechReview', 'Horror', 'Cartoon'];
        const durations = ['30s', '60s', '90s', '120s', '150s', '180s'];

        // Niche parameter — defaults to AI
        const niche = (req.query.niche as string || 'ai').toLowerCase();

        let nichePrompt: string;
        if (niche === 'ai' || niche === 'artificial intelligence') {
            nichePrompt = `Generate ONE random, trendy, viral-worthy YouTube video idea about Artificial Intelligence.
Focus on ONE of these AI sub-topics (pick a different one each time):
- AI tools and productivity hacks
- AI automation for business
- Machine learning breakthroughs
- ChatGPT / Claude / AI assistant tips and tricks
- AI in everyday life
- AI vs human comparisons
- Emerging AI technology and startups
- AI ethics, safety, and the future
- AI for content creators
- How AI is transforming specific industries`;
        } else if (niche === 'any' || niche === 'random') {
            nichePrompt = `Generate ONE random, trendy, viral-worthy YouTube video idea. Pick a unique niche each time — tech, science, history, psychology, nature, space, health, business, AI, culture, mystery, etc.`;
        } else {
            nichePrompt = `Generate ONE random, trendy, viral-worthy YouTube video idea about ${niche}. Be creative and pick a unique angle within this topic.`;
        }

        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 300,
            messages: [{
                role: 'user',
                content: `${nichePrompt}

Return ONLY a JSON object:
{
  "title": "Catchy title (max 8 words)",
  "topic": "Detailed 2-3 sentence description of the video content, what it should cover, the angle, and the hook",
  "style": "pick ONE from the list below",
  "duration": "pick ONE from the list below"
}

AVAILABLE STYLES: ${styles.join(', ')}
AVAILABLE DURATIONS: ${durations.join(', ')}

RULES:
- Be CREATIVE and DIVERSE — never repeat common topics
- Think viral YouTube — surprising facts, mind-blowing breakthroughs
- The title must be click-worthy and engaging
- The topic description should be detailed enough to guide AI video creation
- The style MUST be exactly one of the AVAILABLE STYLES listed above — pick a DIFFERENT style each time, match the style to the topic
- The duration MUST be exactly one of the AVAILABLE DURATIONS listed above — STRONGLY prefer 90s, 120s, or 180s for more valuable, story-rich content
- Output ONLY the JSON, nothing else`
            }]
        });

        const textBlock = msg.content[0];
        if (textBlock.type !== 'text') {
            throw new Error('Unexpected response from Claude');
        }

        let content = textBlock.text.trim();
        if (content.startsWith('```')) {
            content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
        }

        const idea = JSON.parse(content);

        // Validate style and duration are valid values
        if (!styles.includes(idea.style)) idea.style = 'Documentary';
        if (!durations.includes(idea.duration)) idea.duration = '60s';

        // Add music track to the response
        const { getTracksForStyle: getTracksForStyleFn } = await import('./music-library');
        const compatibleTracks = getTracksForStyleFn(idea.style);
        if (compatibleTracks.length > 0) {
            idea.musicTrack = compatibleTracks[Math.floor(Math.random() * compatibleTracks.length)].id;
        }

        log(`Auto-fill generated: "${idea.title}" (music: ${idea.musicTrack || 'none'})`);
        res.json(idea);

    } catch (error: any) {
        log(`Auto-fill error: ${error.message}`);
        res.status(500).json({ error: 'Failed to generate idea' });
    }
});

// Music library - get tracks filtered by style (shows all tracks, marks availability)
app.get('/api/music', async (req, res) => {
    try {
        const { MUSIC_TRACKS, getTracksForStyle: getTracksForStyleFn } = await import('./music-library');
        const style = req.query.style as string;
        const fs = await import('fs');
        const path = await import('path');
        const musicDir = path.join(process.cwd(), 'assets', 'music');

        // Get tracks for this style (from full catalog, not just available)
        const styleTracks = style
            ? MUSIC_TRACKS.filter(t => t.styles.includes(style))
            : MUSIC_TRACKS;

        // Add availability flag to each track
        const tracksWithAvailability = styleTracks.map(t => ({
            ...t,
            available: fs.existsSync(path.join(musicDir, t.file))
        }));

        // Sort: available first, then unavailable
        tracksWithAvailability.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));

        log(`Music library: ${tracksWithAvailability.filter(t => t.available).length}/${tracksWithAvailability.length} tracks available for style="${style || 'all'}"`);
        res.json(tracksWithAvailability);
    } catch (error: any) {
        log(`Music list error: ${error.message}`);
        res.status(500).json({ error: 'Failed to get music list' });
    }
});


// Video library - HTML page for browsing videos
app.get('/library', (req, res) => {
    try {
        if (!fs.existsSync(outDir)) {
            res.send('<html><body><h1>No videos yet</h1></body></html>');
            return;
        }
        const files = fs.readdirSync(outDir).filter((file: string) => file.endsWith('.mp4'));
        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

        const videoCards = files.map((file: string) => {
            const stats = fs.statSync(path.join(outDir, file));
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
            const name = file.replace('.mp4', '').replace(/_/g, ' ');
            const date = new Date(stats.mtime).toLocaleDateString();
            const url = `${baseUrl}/videos/${file}`;
            return `
                <div style="background:#1a1a2e;border:1px solid #333;border-radius:12px;padding:20px;margin:10px 0;">
                    <h3 style="color:#fff;margin:0 0 8px;">${name}</h3>
                    <p style="color:#888;font-size:14px;margin:4px 0;">${date} | ${sizeMB} MB</p>
                    <video src="${url}" controls style="width:100%;border-radius:8px;margin:10px 0;" preload="metadata"></video>
                    <a href="${url}" download style="color:#8b5cf6;text-decoration:none;font-size:14px;">Download</a>
                </div>`;
        }).join('');

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Video Library - AI Video Engine</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: 'Inter', Arial, sans-serif; background: #09090b; color: #fff; padding: 20px; max-width: 800px; margin: 0 auto; }
                    h1 { color: #8b5cf6; }
                    a { color: #8b5cf6; }
                </style>
            </head>
            <body>
                <h1>Video Library</h1>
                <p style="color:#888;">${files.length} video(s) generated</p>
                ${videoCards || '<p>No videos yet. Submit a request from the dashboard.</p>'}
            </body>
            </html>
        `);
    } catch (error) {
        log(`Error in library: ${error}`);
        res.status(500).send('Error loading library');
    }
});

// ============================================================
// MUSIC LIBRARY ENDPOINTS
// ============================================================

// Music library stats (for dashboard)
app.get('/api/music/stats', async (req, res) => {
    try {
        const { MUSIC_TRACKS } = await import('./music-library');
        const fs = await import('fs');
        const path = await import('path');
        const musicDir = path.join(process.cwd(), 'assets', 'music');
        const available = MUSIC_TRACKS.filter((t: any) => fs.existsSync(path.join(musicDir, t.file)));
        const missing = MUSIC_TRACKS.filter((t: any) => !fs.existsSync(path.join(musicDir, t.file)));
        res.json({
            total: MUSIC_TRACKS.length,
            available: available.length,
            missing: missing.length,
            missingTracks: missing.map((t: any) => ({ id: t.id, name: t.name, file: t.file }))
        });
    } catch (error: any) {
        log(`Music stats error: ${error.message}`);
        res.status(500).json({ error: 'Failed to get music stats' });
    }
});

// Stream/preview a music track by ID
app.get('/api/music/preview/:id', async (req, res) => {
    try {
        const { getTrackById } = await import('./music-library');
        const track = getTrackById(req.params.id);

        if (!track) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const musicDir = path.join(process.cwd(), 'assets', 'music');
        const filePath = path.join(musicDir, track.file);

        if (!fs.existsSync(filePath)) {
            log(`Music file not found: ${filePath}`);
            return res.status(404).json({ error: `Music file not found: ${track.file}` });
        }

        const stat = fs.statSync(filePath);
        const range = req.headers.range;

        if (range) {
            // Support range requests for seeking
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
            const chunkSize = end - start + 1;

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${stat.size}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'audio/mpeg',
            });
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.writeHead(200, {
                'Content-Length': stat.size,
                'Content-Type': 'audio/mpeg',
            });
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error: any) {
        log(`Music preview error: ${error.message}`);
        res.status(500).json({ error: 'Failed to stream music' });
    }
});

// ============================================================
// COPYRIGHT CHECK ENDPOINTS
// ============================================================

// Check a single music track's copyright status
app.get('/api/copyright/check/:trackId', async (req, res) => {
    try {
        const { checkMusicTrack } = await import('./copyright-checker');
        const result = checkMusicTrack(req.params.trackId);
        res.json({
            trackId: req.params.trackId,
            safe: result.safe,
            details: result.details,
            license: result.track?.license || null,
            source: result.track?.source || null,
            sourceUrl: result.track?.sourceUrl || null
        });
    } catch (error: any) {
        log(`Copyright check error: ${error.message}`);
        res.status(500).json({ error: 'Copyright check failed' });
    }
});

// Full copyright report for a set of assets
app.post('/api/copyright/report', express.json(), async (req, res) => {
    try {
        const { generateCopyrightReport } = await import('./copyright-checker');
        const { trackId, imageUrls, videoUrls } = req.body;

        if (!trackId) {
            return res.status(400).json({ error: 'trackId is required' });
        }

        const report = generateCopyrightReport(
            trackId,
            imageUrls || [],
            videoUrls || []
        );

        log(`Copyright report: score=${report.score}, safe=${report.safe}`);
        res.json(report);
    } catch (error: any) {
        log(`Copyright report error: ${error.message}`);
        res.status(500).json({ error: 'Copyright report failed' });
    }
});

// Library-wide copyright status
app.get('/api/copyright/all', async (req, res) => {
    try {
        const { MUSIC_TRACKS } = await import('./music-library');
        const summary = {
            totalTracks: MUSIC_TRACKS.length,
            verifiedSafe: MUSIC_TRACKS.filter(t => t.copyrightSafe).length,
            unverified: MUSIC_TRACKS.filter(t => !t.copyrightSafe).length,
            tracks: MUSIC_TRACKS.map(t => ({
                id: t.id,
                name: t.name,
                copyrightSafe: t.copyrightSafe,
                license: t.license,
                source: t.source,
                sourceUrl: t.sourceUrl
            })),
            imageSources: 'Pexels — royalty-free under Pexels License',
            videoSources: 'Pexels — royalty-free under Pexels License',
            overallSafe: MUSIC_TRACKS.every(t => t.copyrightSafe)
        };
        res.json(summary);
    } catch (error: any) {
        log(`Copyright all error: ${error.message}`);
        res.status(500).json({ error: 'Failed to load copyright status' });
    }
});

// ============================================================
// AUTH ENDPOINT
// ============================================================

// Server-side login validation
app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (!password) {
        res.status(400).json({ error: 'Password required' });
        return;
    }
    if (password === VIDEO_API_KEY) {
        log(`Login success from ${req.ip}`);
        res.json({ success: true, apiKey: VIDEO_API_KEY });
    } else {
        log(`Login FAILED from ${req.ip}`);
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({
        service: 'AI Video Engine',
        status: 'online',
        version: '2.0',
        queue: {
            pending: jobQueue.filter(j => j.status === 'queued').length,
            processing: jobQueue.some(j => j.status === 'processing')
        }
    });
});

app.listen(PORT, () => {
    console.log(`Video Engine running on http://localhost:${PORT}`);
    console.log(`Video Library: http://localhost:${PORT}/library`);
    console.log(`Serving videos from: ${outDir}`);
});
