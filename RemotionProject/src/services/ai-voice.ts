import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import util from 'util';

dotenv.config();

const execPromise = util.promisify(exec);

/**
 * Detect audio format from raw buffer magic bytes.
 * Returns the correct file extension.
 */
function detectAudioFormat(buffer: Buffer): string {
    if (buffer.length < 12) return '.wav';
    const header = buffer.subarray(0, 4).toString('ascii');
    if (header === 'RIFF') return '.wav';
    if (header === 'OggS') return '.ogg';
    if (header === 'fLaC') return '.flac';
    if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return '.mp3';
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return '.mp3'; // ID3
    return '.wav'; // Default to wav (safest for Chromium)
}

export async function generateVoiceover(text: string, outputBaseName: string): Promise<string> {
    // Clean text: remove quotes, special chars, and newlines
    const cleanText = (text || "Default audio content")
        .replace(/"/g, '')
        .replace(/'/g, '')
        .replace(/\*/g, '')
        .replace(/\n/g, ' ')
        .trim();

    console.log(`🗣️ Generating Voiceover for: "${cleanText.substring(0, 50)}..."`);

    const wavespeedKey = process.env.WAVESPEED_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    // Output setup
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }
    // Strip extension from base name - we'll detect and add the correct one
    const nameWithoutExt = outputBaseName.replace(/\.[^.]+$/, '');

    // --- STRATEGY 1: WAVESPEED AI (Qwen3-TTS) ---
    if (wavespeedKey) {
        try {
            console.log("🌊 Attempting WaveSpeed AI TTS (Qwen3-TTS)...");

            // Step 1: Submit TTS task
            const submitUrl = 'https://api.wavespeed.ai/api/v3/wavespeed-ai/qwen3-tts/text-to-speech';

            const submitResponse = await axios.post(submitUrl, {
                text: cleanText,
                language: "auto",
                voice: "Eric",
                style_instruction: "Speak clearly and engagingly, like a professional narrator"
            }, {
                headers: {
                    'Authorization': `Bearer ${wavespeedKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (submitResponse.data?.code !== 200 || !submitResponse.data?.data?.id) {
                throw new Error(`WaveSpeed submit failed: ${JSON.stringify(submitResponse.data)}`);
            }

            const taskId = submitResponse.data.data.id;
            console.log(`📋 WaveSpeed Task ID: ${taskId}`);

            // Step 2: Poll for result
            const resultUrl = `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`;
            let audioUrl: string | null = null;
            const maxPolls = 150;

            for (let i = 0; i < maxPolls; i++) {
                await new Promise(resolve => setTimeout(resolve, 2000));

                const resultResponse = await axios.get(resultUrl, {
                    headers: { 'Authorization': `Bearer ${wavespeedKey}` },
                    timeout: 10000
                });

                const status = resultResponse.data?.data?.status;
                console.log(`⏳ WaveSpeed Status: ${status} (poll ${i + 1}/${maxPolls})`);

                if (status === 'completed') {
                    const outputs = resultResponse.data?.data?.outputs;
                    if (outputs && outputs.length > 0) {
                        audioUrl = outputs[0];
                    }
                    break;
                } else if (status === 'failed') {
                    throw new Error(`WaveSpeed task failed: ${JSON.stringify(resultResponse.data)}`);
                }
            }

            if (!audioUrl) {
                throw new Error("WaveSpeed: No audio URL in response or timed out");
            }

            // Step 3: Download the audio file
            console.log(`📥 Downloading audio from WaveSpeed...`);
            const audioResponse = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            if (audioResponse.data && audioResponse.data.length > 1000) {
                const audioBuffer = Buffer.from(audioResponse.data);
                const ext = detectAudioFormat(audioBuffer);
                const outputFilename = `${nameWithoutExt}${ext}`;
                const outputPath = path.join(publicDir, outputFilename);
                fs.writeFileSync(outputPath, audioBuffer);
                console.log(`✅ WaveSpeed Success: ${outputFilename} (${audioBuffer.length} bytes, format: ${ext})`);
                return outputFilename;
            } else {
                throw new Error("WaveSpeed returned empty or too small audio file");
            }

        } catch (e: any) {
            console.warn(`⚠️ WaveSpeed Failed: ${e.message}`);
            if (e.response?.data) {
                const errorData = typeof e.response.data === 'string'
                    ? e.response.data
                    : JSON.stringify(e.response.data);
                console.warn(`API Response: ${errorData.substring(0, 500)}`);
            }
        }
    }

    // --- STRATEGY 2: OPENAI TTS ---
    if (openaiKey) {
        try {
            console.log("🤖 Attempting OpenAI TTS...");
            const response = await axios.post('https://api.openai.com/v1/audio/speech', {
                model: "tts-1",
                input: cleanText,
                voice: "alloy"
            }, {
                headers: { 'Authorization': `Bearer ${openaiKey}` },
                responseType: 'arraybuffer',
                timeout: 30000
            });
            // OpenAI returns MP3 by default
            const outputFilename = `${nameWithoutExt}.mp3`;
            const outputPath = path.join(publicDir, outputFilename);
            fs.writeFileSync(outputPath, response.data);
            console.log(`✅ OpenAI TTS Success: ${outputFilename}`);
            return outputFilename;
        } catch (e: any) {
            console.warn(`⚠️ OpenAI TTS Failed: ${e.message}`);
        }
    }

    // --- STRATEGY 3: LOCAL FALLBACK (cross-platform) ---
    const isLinux = process.platform === 'linux';
    const isWindows = process.platform === 'win32';
    // Local fallbacks produce WAV
    const outputFilename = `${nameWithoutExt}.wav`;
    const outputPath = path.join(publicDir, outputFilename);

    if (isLinux) {
        console.warn("🔄 Engaging Linux Fallback (espeak-ng + ffmpeg)...");
        try {
            const wavTemp = path.join(publicDir, `temp_espeak_${Date.now()}.wav`);
            const shellText = cleanText.replace(/'/g, "'\\''");

            await execPromise(`espeak-ng -v en -s 150 -p 50 -w "${wavTemp}" '${shellText}'`, { timeout: 30000 });

            // Try to enhance with ffmpeg, fall back to raw wav
            try {
                await execPromise(
                    `ffmpeg -y -i "${wavTemp}" -af "highpass=f=80,lowpass=f=8000,compand=attacks=0.3:decays=0.8:points=-80/-80|-45/-25|-27/-15|0/-10:soft-knee=6,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 1 "${outputPath}"`,
                    { timeout: 30000 }
                );
                try { fs.unlinkSync(wavTemp); } catch (_) { }
            } catch (_) {
                // ffmpeg not available, use raw espeak output
                if (fs.existsSync(wavTemp)) {
                    fs.renameSync(wavTemp, outputPath);
                }
            }

            if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
                console.log(`✅ Linux TTS Fallback Success: ${outputFilename}`);
                return outputFilename;
            }
            throw new Error("espeak-ng output file too small");
        } catch (e: any) {
            console.error(`❌ Linux Fallback Failed: ${e.message}`);
        }
    } else if (isWindows) {
        console.warn("🔄 Engaging Windows Fallback (PowerShell TTS)...");
        try {
            const wavTemp = path.join(publicDir, `temp_sapi_${Date.now()}.wav`);
            const psScript = `
            Add-Type -AssemblyName System.Speech;
            $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;
            $speak.Rate = 0;
            $speak.SetOutputToWaveFile('${wavTemp.replace(/\\/g, '\\\\')}');
            $speak.Speak('${cleanText.replace(/'/g, "''")}');
            $speak.Dispose();
            `;

            const psFile = path.join(process.cwd(), `temp_tts_${Date.now()}.ps1`);
            fs.writeFileSync(psFile, psScript);
            await execPromise(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, { timeout: 30000 });
            try { fs.unlinkSync(psFile); } catch (_) { }

            // Just use the WAV directly (Chromium supports WAV natively)
            if (fs.existsSync(wavTemp)) {
                fs.renameSync(wavTemp, outputPath);
            }

            if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
                console.log(`✅ Windows TTS Fallback Success: ${outputFilename}`);
                return outputFilename;
            }
            throw new Error("PowerShell TTS output file too small");
        } catch (e: any) {
            console.error(`❌ Windows Fallback Failed: ${e.message}`);
        }
    }

    // ULTIMATE FALLBACK: Return empty string so Remotion doesn't crash
    console.error("❌ All TTS strategies failed. Video will have no voiceover.");
    return "";
}
