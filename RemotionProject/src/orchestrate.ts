import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { z } from 'zod';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { transcribeForSubtitles, SubtitleChunk } from './services/transcribe';
import { getStyleConfig } from './visualStyles';

dotenv.config();

const execPromise = util.promisify(exec);

// --- Guardrail: Validation Schema ---
const videoSchema = z.object({
    title: z.string().min(1).max(100),
    topic: z.string().min(1),
    duration: z.string().regex(/^\d+s$/, "Duration must be like '30s', '60s'").default("30s"),
    style: z.string().default("Documentary"),
    musicTrack: z.string().optional()
});

async function main() {
    const argv = yargs(hideBin(process.argv)).argv as any;

    console.log("🎬 Engine Started: Orchestrating Video Generation...");

    // 1. Validate Inputs (Guardrails)
    try {
        const inputs = videoSchema.parse({
            title: argv.title,
            topic: argv.topic,
            duration: argv.duration,
            style: argv.style,
            musicTrack: argv.musicTrack || undefined
        });

        console.log(`✅ Input Validated: ${JSON.stringify(inputs)}`);

        // 2. Prepare Output Filename
        const safeTitle = inputs.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const outputFile = `${safeTitle}.mp4`;
        const outputPath = `out/${outputFile}`;

        console.log(`⏳ Rendering Video to: ${outputPath}`);

        // 3. GENERATE AI SCRIPT
        console.log("🧠 Generating AI Content...");

        const { generateScript } = await import('./services/ai-script');
        const durationSeconds = parseInt(inputs.duration.replace('s', ''), 10);

        let scriptData: any = {
            title: inputs.title,
            segment1Title: "Introduction",
            segment1: "Welcome to this video.",
            segment2Title: "The Story",
            segment2: "Here is the main content.",
            segment3Title: "Conclusion",
            segment3: "Thank you for watching.",
            cta: "Watch Now",
            keywords: "technology,nature,cityscape,sunset,forest,ocean,mountain,abstract,innovation"
        };

        try {
            scriptData = await generateScript(inputs.topic, durationSeconds, inputs.style);
            console.log("✅ Script received from Claude");
        } catch (e: any) {
            console.error("❌ CLAUDE API ERROR:", e.message || e);
            console.warn("⚠️ Using fallback script.");
        }

        // 4. Fetch 9 images (3 per segment) + 3 videos (1 per segment) from Pexels
        const imageQueries: string[] = scriptData.imageQueries && scriptData.imageQueries.length >= 9
            ? scriptData.imageQueries.slice(0, 9)
            : [
                `${inputs.topic} scene overview`,
                `${inputs.topic} detail close-up`,
                `${inputs.topic} wide angle`,
                `${inputs.topic} action moment`,
                `${inputs.topic} people interaction`,
                `${inputs.topic} environment`,
                `${inputs.topic} dramatic angle`,
                `${inputs.topic} aerial perspective`,
                `${inputs.topic} close detail`
            ];

        let images: string[] = [];
        let videoClips: string[] = [];
        const pexelsKey = process.env.PEXELS_API_KEY;

        if (pexelsKey) {
            // Fetch 9 images
            console.log("🖼️ Fetching 9 images from Pexels API...");
            for (const query of imageQueries) {
                try {
                    // Randomize page to get diverse results
                    const page = Math.floor(Math.random() * 3) + 1;
                    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&page=${page}&orientation=landscape`, {
                        headers: { Authorization: pexelsKey }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.photos && data.photos.length > 0) {
                            // Pick a random photo from the results for diversity
                            const photo = data.photos[Math.floor(Math.random() * data.photos.length)];
                            images.push(photo.src.large2x);
                            console.log(`   ✅ Pexels image: "${query}"`);
                            continue;
                        }
                    }
                } catch (e: any) {
                    console.warn(`   ⚠️ Pexels image failed for "${query}": ${e.message}`);
                }
                images.push(`https://picsum.photos/seed/${encodeURIComponent(query + Date.now())}/1600/900`);
            }

            // Fetch 3 video clips (1 per segment, using first query of each segment)
            console.log("🎬 Fetching 3 video clips from Pexels...");
            const videoQueries = [imageQueries[0], imageQueries[3], imageQueries[6]];
            for (const query of videoQueries) {
                try {
                    const res = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&size=medium`, {
                        headers: { Authorization: pexelsKey }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.videos && data.videos.length > 0) {
                            const vid = data.videos[Math.floor(Math.random() * data.videos.length)];
                            // Pick HD quality file
                            const vidFile = vid.video_files.find((f: any) => f.quality === 'hd' && f.width >= 1280)
                                || vid.video_files.find((f: any) => f.quality === 'sd')
                                || vid.video_files[0];
                            if (vidFile) {
                                videoClips.push(vidFile.link);
                                console.log(`   ✅ Pexels video: "${query}"`);
                                continue;
                            }
                        }
                    }
                } catch (e: any) {
                    console.warn(`   ⚠️ Pexels video failed for "${query}": ${e.message}`);
                }
                videoClips.push(''); // No video clip for this segment
            }
        } else {
            console.log("🖼️ No PEXELS_API_KEY - using picsum fallback images");
            images = imageQueries.map((q, i) => `https://picsum.photos/seed/${encodeURIComponent(q + i)}/1600/900`);
            videoClips = ['', '', ''];
        }

        console.log(`🖼️ ${images.length} images + ${videoClips.filter(v => v).length} video clips ready`);

        // 5. Generate Voiceover
        let voicePath = "";
        try {
            const segment1 = scriptData.segment1.replace(/['"*]/g, '');
            const segment2 = scriptData.segment2.replace(/['"*]/g, '');
            const segment3 = scriptData.segment3.replace(/['"*]/g, '');
            const cta = scriptData.cta.replace(/['"*]/g, '');

            const fullScript = `${segment1}. ${segment2}. ${segment3}. ${cta}`;
            console.log("🗣️ Generating Voiceover...");

            const { generateVoiceover } = await import('./services/ai-voice');
            voicePath = await generateVoiceover(fullScript, `voice-${Date.now()}.mp3`);

            // Verify the voiceover file was actually created
            if (voicePath) {
                const voiceFile = path.join(process.cwd(), 'public', voicePath);
                if (fs.existsSync(voiceFile)) {
                    const size = fs.statSync(voiceFile).size;
                    console.log(`✅ Voiceover file verified: ${voicePath} (${(size / 1024).toFixed(1)} KB)`);

                    // Convert to PCM WAV 16-bit (guaranteed Chromium headless compatibility)
                    try {
                        const ffmpegPath = require('ffmpeg-static');
                        const wavName = voicePath.replace(/\.[^.]+$/, '-pcm.wav');
                        const wavFullPath = path.join(process.cwd(), 'public', wavName);
                        await execPromise(`"${ffmpegPath}" -y -i "${voiceFile}" -acodec pcm_s16le -ar 44100 -ac 1 "${wavFullPath}"`, { timeout: 30000 });
                        if (fs.existsSync(wavFullPath) && fs.statSync(wavFullPath).size > 1000) {
                            console.log(`✅ Voiceover re-encoded to PCM WAV: ${wavName}`);
                            voicePath = wavName;

                            // Get exact duration by reading WAV header (reliable cross-platform)
                            try {
                                const wavBuf = fs.readFileSync(wavFullPath);
                                if (wavBuf.length > 44 && wavBuf.toString('ascii', 0, 4) === 'RIFF') {
                                    const sampleRate = wavBuf.readUInt32LE(24);
                                    const bitsPerSample = wavBuf.readUInt16LE(34);
                                    const numChannels = wavBuf.readUInt16LE(22);
                                    let dataSize = 0;
                                    for (let i = 36; i < Math.min(wavBuf.length - 4, 200); i++) {
                                        if (wavBuf.toString('ascii', i, i + 4) === 'data') {
                                            dataSize = wavBuf.readUInt32LE(i + 4);
                                            break;
                                        }
                                    }
                                    if (dataSize > 0 && sampleRate > 0) {
                                        const bytesPerSec = sampleRate * numChannels * (bitsPerSample / 8);
                                        const totalSec = dataSize / bytesPerSec;
                                        console.log(`⏱️ Voiceover Duration: ${totalSec.toFixed(2)}s (${sampleRate}Hz, ${bitsPerSample}bit, ${numChannels}ch)`);
                                        scriptData.voiceDuration = totalSec;
                                    }
                                }
                            } catch (durErr: any) {
                                console.warn(`⚠️ WAV duration read failed: ${durErr.message}`);
                            }
                        }
                    } catch (convErr: any) {
                        console.warn(`⚠️ WAV re-encode skipped: ${convErr.message}`);
                    }
                } else {
                    console.warn(`⚠️ Voiceover file not found at: ${voiceFile}`);
                    voicePath = "";
                }
            }
        } catch (e: any) {
            console.error("⚠️ Voiceover Failed - Proceeding silently:", e.message);
        }

        // 5b. Transcribe voiceover for word-level subtitle timestamps
        let subtitleTimestamps: SubtitleChunk[] | null = null;
        if (voicePath) {
            try {
                const wavFullPath = path.join(process.cwd(), 'public', voicePath);
                subtitleTimestamps = await transcribeForSubtitles(wavFullPath);
            } catch (e: any) {
                console.warn(`⚠️ Subtitle transcription skipped: ${e.message}`);
            }
        }

        // 6. Load Branding Config
        let brandingConfig: any = {};
        try {
            const configPath = path.join(process.cwd(), 'assets', 'branding.config.json');
            if (fs.existsSync(configPath)) {
                const rawConfig = fs.readFileSync(configPath, 'utf-8');
                brandingConfig = JSON.parse(rawConfig);
                console.log("🎨 Branding Config Loaded");
            }
        } catch (e) {
            console.warn("⚠️ Could not load branding config, using defaults.");
        }

        // Ensure public/ directory exists
        const publicDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // Logo - skip for now (Remotion Img component causes 404 crashes)
        // To enable: ensure logo.png is in public/ BEFORE bundling
        const finalLogo: string | undefined = undefined;

        // Music - use user-selected track if provided, otherwise random
        const styleConfig = getStyleConfig(inputs.style);
        let finalMusicUrl: string | undefined = undefined;

        const { getRandomTrackForStyle, getTracksForStyle: listTracksForStyle, getTrackById } = await import('./music-library');
        const compatibleTracks = listTracksForStyle(inputs.style);
        console.log(`🎵 Music pool for "${inputs.style}": ${compatibleTracks.length} tracks available`);

        // Determine which track to use
        let selectedTrackFile: string;
        if (inputs.musicTrack) {
            // User explicitly selected a track in the UI
            const userTrack = getTrackById(inputs.musicTrack);
            if (userTrack) {
                selectedTrackFile = userTrack.file;
                console.log(`🎵 User selected: "${userTrack.name}" (${userTrack.file})`);
            } else {
                // Track ID not found, fall back to random
                const randomTrack = getRandomTrackForStyle(inputs.style);
                selectedTrackFile = randomTrack.file;
                console.log(`🎵 User track "${inputs.musicTrack}" not found, random pick: "${randomTrack.name}"`);
            }
        } else {
            // No track specified — random selection
            const randomTrack = getRandomTrackForStyle(inputs.style);
            selectedTrackFile = randomTrack.file;
            console.log(`🎵 Random pick: "${randomTrack.name}" (${randomTrack.file})`);
        }

        let musicSrc = path.join(process.cwd(), 'assets', 'music', selectedTrackFile);
        if (!fs.existsSync(musicSrc)) {
            // If selected file doesn't exist on disk, fallback through options
            console.log(`🎵 File "${selectedTrackFile}" not on disk, trying alternatives...`);
            const fallbackOrder = ['inspirational.mp3', 'documentary.mp3', 'cinematic.mp3'];
            let found = false;
            for (const fb of fallbackOrder) {
                const fbPath = path.join(process.cwd(), 'assets', 'music', fb);
                if (fs.existsSync(fbPath)) {
                    musicSrc = fbPath;
                    console.log(`🎵 Fallback to: ${fb}`);
                    found = true;
                    break;
                }
            }
            if (!found) {
                console.log(`🎵 No music files found, proceeding without music`);
            }
        } else {
            console.log(`🎵 Using: ${selectedTrackFile}`);
        }
        if (fs.existsSync(musicSrc)) {
            try {
                const ffmpegPath = require('ffmpeg-static');
                const musicDest = path.join(publicDir, 'bgmusic.wav');
                const trimDuration = durationSeconds + 2; // Trim to video length + 2s buffer
                console.log(`🎵 Converting music to PCM WAV (trimmed to ${trimDuration}s)...`);
                await execPromise(`"${ffmpegPath}" -y -i "${musicSrc}" -t ${trimDuration} -acodec pcm_s16le -ar 44100 -ac 1 "${musicDest}"`, { timeout: 60000 });
                if (fs.existsSync(musicDest) && fs.statSync(musicDest).size > 1000) {
                    finalMusicUrl = '/bgmusic.wav';
                    console.log(`🎵 Music ready (${(fs.statSync(musicDest).size / 1024 / 1024).toFixed(1)} MB)`);
                }
            } catch (e: any) {
                console.warn(`⚠️ Music conversion failed, skipping: ${e.message}`);
            }
        }

        // 7. Build full narration for captions
        const fullNarration = `${scriptData.segment1}. ${scriptData.segment2}. ${scriptData.segment3}. ${scriptData.cta}`;

        // 8. Build scene-based segments (3 images + 1 video per segment)
        const segments = [
            {
                title: scriptData.segment1Title || 'Introduction',
                narration: scriptData.segment1,
                imageUrl: images[0],
                imageUrls: [images[0], images[1], images[2]].filter(Boolean),
                videoUrl: videoClips[0] || undefined
            },
            {
                title: scriptData.segment2Title || 'The Story',
                narration: scriptData.segment2,
                imageUrl: images[3] || images[1],
                imageUrls: [images[3], images[4], images[5]].filter(Boolean),
                videoUrl: videoClips[1] || undefined
            },
            {
                title: scriptData.segment3Title || 'Conclusion',
                narration: scriptData.segment3,
                imageUrl: images[6] || images[2],
                imageUrls: [images[6], images[7], images[8]].filter(Boolean),
                videoUrl: videoClips[2] || undefined
            }
        ];

        // 9. Calculate Dynamic Duration & Build Props

        // Dynamic duration based on voiceover
        const introDuration = 3;
        const outroDuration = 3;
        let finalDuration = durationSeconds;

        if (scriptData.voiceDuration) {
            const calculatedDuration = Math.ceil(introDuration + scriptData.voiceDuration + outroDuration);
            // Ensure audio isn't cut off
            finalDuration = calculatedDuration;
            console.log(`⏱️  Dynamic Duration: Voice (${scriptData.voiceDuration.toFixed(1)}s) + Intro/Outro (${introDuration + outroDuration}s) = ${finalDuration}s`);
            console.log(`⚠️  Overriding default duration (${durationSeconds}s) to match voiceover.`);
        }

        const inputProps = {
            title: scriptData.title || inputs.title,
            script: `${scriptData.segment1}\n\n${scriptData.segment2}\n\n${scriptData.segment3}`,
            voiceoverUrl: voicePath ? `/${voicePath}` : undefined,
            durationInSeconds: finalDuration,
            // Timing Metadata
            introDuration: introDuration,
            outroDuration: outroDuration,
            voiceDuration: scriptData.voiceDuration || (finalDuration - introDuration - outroDuration),
            // Branding - use style colors, fallback to branding config
            primaryColor: styleConfig.primaryColor || brandingConfig.primaryColor || '#1a1a2e',
            accentColor: styleConfig.accentColor || brandingConfig.accentColor || '#06b6d4',
            cta: scriptData.cta || brandingConfig.cta || 'Watch Now',
            musicUrl: finalMusicUrl,
            // Captions
            enableCaptions: true,
            captionScript: fullNarration,
            // Whisper-based subtitle timestamps (if available)
            subtitleTimestamps: subtitleTimestamps || undefined,
            // Scene segments
            segments: segments,
            // Visual Style
            visualStyle: inputs.style
        };


        // Write props to temp file (use relative filename - Remotion requires this)
        const tempPropsFilename = `temp-props-${Date.now()}.json`;
        const tempPropsFile = path.join(process.cwd(), tempPropsFilename);
        const propsJson = JSON.stringify(inputProps, null, 2);
        fs.writeFileSync(tempPropsFile, propsJson);
        console.log(`📝 Props written to: ${tempPropsFilename}`);
        console.log(`📝 Props preview: title="${inputProps.title}", segments=${inputProps.segments?.length || 0}, voice="${inputProps.voiceoverUrl || 'none'}", music="${inputProps.musicUrl || 'none'}"`);

        // Also write a persistent debug copy
        const debugPropsFile = path.join(process.cwd(), 'debug-last-props.json');
        fs.writeFileSync(debugPropsFile, propsJson);

        // 10. Render
        const cmd = `npx remotion render src/index.ts AiVideo ${outputPath} --props=./${tempPropsFilename} --log=error`;
        console.log(`🎬 Rendering...`);
        await execPromise(cmd, { maxBuffer: 1024 * 1024 * 50 });

        // Cleanup temp props (keep debug copy)
        try { fs.unlinkSync(tempPropsFile); } catch (e) { }

        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
        const publicLink = `${baseUrl}/videos/${outputFile}`;

        console.log("---------------------------------------------------");
        console.log("🎉 SUCCESS: Video Generated!");
        console.log(`🔗 Link: ${publicLink}`);
        console.log("---------------------------------------------------");

    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("❌ Invalid Input:", error.issues);
        } else {
            console.error("❌ Rendering Error:", error);
        }
        process.exit(1);
    }
}

main();
