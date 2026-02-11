import axios from 'axios';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

export interface WordTimestamp {
    word: string;
    start: number; // seconds
    end: number;   // seconds
}

export interface SubtitleChunk {
    text: string;
    startTime: number; // seconds
    endTime: number;   // seconds
}

/**
 * Transcribes a WAV file using Groq Whisper API and returns word-level timestamps.
 * Returns null if GROQ_API_KEY is not set or transcription fails.
 */
export async function transcribeForSubtitles(wavFilePath: string): Promise<SubtitleChunk[] | null> {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
        console.warn('⚠️ GROQ_API_KEY not set — skipping Whisper transcription (subtitles will use fallback timing)');
        return null;
    }

    const absolutePath = path.isAbsolute(wavFilePath)
        ? wavFilePath
        : path.join(process.cwd(), 'public', wavFilePath);

    if (!fs.existsSync(absolutePath)) {
        console.warn(`⚠️ WAV file not found for transcription: ${absolutePath}`);
        return null;
    }

    try {
        console.log('🎤 Transcribing voiceover with Groq Whisper for word-level timestamps...');

        const form = new FormData();
        form.append('file', fs.createReadStream(absolutePath));
        form.append('model', 'whisper-large-v3-turbo');
        form.append('response_format', 'verbose_json');
        form.append('timestamp_granularities[]', 'word');

        const response = await axios.post(
            'https://api.groq.com/openai/v1/audio/transcriptions',
            form,
            {
                headers: {
                    'Authorization': `Bearer ${groqKey}`,
                    ...form.getHeaders(),
                },
                timeout: 60000,
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
            }
        );

        const data = response.data;
        const words: WordTimestamp[] = data.words || [];

        if (words.length === 0) {
            console.warn('⚠️ Whisper returned no word timestamps');
            return null;
        }

        console.log(`✅ Whisper detected ${words.length} words with timestamps`);

        // Group words into subtitle chunks (5-6 words each)
        const WORDS_PER_CHUNK = 6;
        const chunks: SubtitleChunk[] = [];

        for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
            const group = words.slice(i, i + WORDS_PER_CHUNK);
            const text = group.map(w => w.word).join(' ');
            const startTime = group[0].start;
            const endTime = group[group.length - 1].end;

            chunks.push({ text, startTime, endTime });
        }

        console.log(`📝 Generated ${chunks.length} subtitle chunks from Whisper timestamps`);

        // Log first few for debugging
        chunks.slice(0, 3).forEach((c, i) => {
            console.log(`   Chunk ${i + 1}: [${c.startTime.toFixed(2)}s - ${c.endTime.toFixed(2)}s] "${c.text.substring(0, 40)}..."`);
        });

        return chunks;

    } catch (err: any) {
        console.warn(`⚠️ Groq Whisper transcription failed: ${err.message}`);
        if (err.response?.data) {
            console.warn(`   API Response: ${JSON.stringify(err.response.data).substring(0, 300)}`);
        }
        return null;
    }
}
