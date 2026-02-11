import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

const outputDir = path.join(process.cwd(), 'assets');
const rawWav = path.join(outputDir, 'voiceover_raw.wav');
const outputWav = path.join(outputDir, 'voiceover.wav');
const psScriptPath = path.join(outputDir, 'tts_script.ps1');

// Short, punchy script for 3 segments (approx 15-20s)
const DEFAULT_SCRIPT =
    `Automate your video production with AI. Just prompt, and Remotion builds the scene. ` +
    `Customize everything instantly. Your brand colors and assets update automatically. ` +
    `Deliver professional results in minutes. Speed, quality, and consistency in one workflow.`;

const textToSpeak = process.env.VOICEOVER_TEXT ?? DEFAULT_SCRIPT;

const apiKey = process.env.WAVESPEED_API_KEY;
const useLocal = process.argv.includes('--local') || !apiKey;

const ensureOutputDir = () => {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
};

const getFfmpegPath = () => {
    if (process.platform === 'win32') {
        return path.join(process.cwd(), 'ffmpeg.exe');
    }
    return 'ffmpeg';
};

const enhanceAudio = async (input: string, output: string) => {
    const ffmpegPath = getFfmpegPath();

    const filters = [
        'highpass=f=80',
        'lowshelf=g=2:f=200',
        'acompressor=threshold=-18dB:ratio=2:attack=10:release=200',
        'loudnorm=I=-16:TP=-1.5:LRA=11'
    ].join(',');

    const command = `"${ffmpegPath}" -y -i "${input}" -af "${filters}" -ar 44100 -ac 2 "${output}"`;

    console.log('Enhancing audio...');
    await execPromise(command);
};

const generateLocalVoiceover = async () => {
    if (process.platform !== 'win32') {
        throw new Error('Local TTS fallback is only supported on Windows.');
    }

    const textFile = path.join(outputDir, 'tts_text.txt');
    fs.writeFileSync(textFile, textToSpeak, 'utf-8');

    const psScript = `
$text = Get-Content -Path "${textFile.replace(/\\/g, '\\\\')}" -Raw
$speak = New-Object -ComObject SAPI.SpVoice
$speak.Rate = 0  # Normal speed for clarity
$stream = New-Object -ComObject SAPI.SpFileStream
$stream.Open("${rawWav.replace(/\\/g, '\\\\')}", 3)
$speak.AudioOutputStream = $stream
$speak.Speak($text)
$stream.Close()
Write-Host "TTS generation complete"
`;

    fs.writeFileSync(psScriptPath, psScript, 'utf-8');

    console.log('Generating voiceover with Windows TTS...');
    await execPromise(`powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`);
    console.log(`Raw TTS saved: ${rawWav}`);

    await enhanceAudio(rawWav, outputWav);
    console.log(`Enhanced voiceover saved: ${outputWav}`);

    for (const f of [rawWav, textFile, psScriptPath]) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
    }
};

const generateVoiceover = async () => {
    ensureOutputDir();
    try {
        if (useLocal) {
            await generateLocalVoiceover();
            return;
        }
        console.log('WaveSpeed API not configured. Use --local for Windows TTS.');
    } catch (error) {
        console.error('Error:', error);
        process.exitCode = 1;
    }
};

generateVoiceover();
