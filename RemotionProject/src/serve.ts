import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Simple file logger
const fs = require('fs');
const logFile = path.join(process.cwd(), 'server.log');
function log(msg: string) {
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logFile, entry);
    console.log(msg);
}

// Enable CORS so Web UI can fetch from any origin
app.use(cors());

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

        const cmd = `npm run orchestrate -- --title "${cmdTitle}" --topic "${cmdTopic}" --style "${cmdStyle}" --duration "${cmdDuration}"`;

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
            return {
                id: index,
                title: file.replace('.mp4', '').replace(/_/g, ' '),
                status: 'Ready',
                link: `${baseUrl}/videos/${file}`,
                timestamp: stats.mtime,
                size: `${sizeMB} MB`
            };
        }).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        res.json(videos);
    } catch (error) {
        log(`Error listing videos: ${error}`);
        res.status(500).json({ error: "Failed to list videos" });
    }
});

// Trigger video generation (queued)
app.post('/trigger', async (req, res) => {
    const { title, topic, style, duration } = req.body;

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

// Delete a video (and associated voice files)
app.delete('/api/videos/:filename', (req, res) => {
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
