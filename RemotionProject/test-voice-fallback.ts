import { generateVoiceover } from './src/services/ai-voice';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("🧪 Testing Voiceover Fallback...");
    try {
        const file = await generateVoiceover("Hello, this is a test of the emergency broadcast system.", "test-fallback.mp3");
        console.log(`✅ Success! File generated at public/${file}`);
    } catch (e) {
        console.error("❌ Failed:", e);
    }
}

test();
