import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

export interface VideoScript {
    title: string;
    segment1: string;
    segment1Title: string;
    segment2: string;
    segment2Title: string;
    segment3: string;
    segment3Title: string;
    cta: string;
    keywords: string;
    imageQueries?: string[];
}

export async function generateScript(topic: string, duration: number, style: string): Promise<VideoScript> {
    console.log(`🤖 Claude Thinking... Topic: "${topic}"`);

    if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error("⛔ ANTHROPIC_API_KEY missing in .env");
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Calculate target word count (approx 140 words per minute / 2.3 words per second)
    const targetWordCount = Math.floor(duration * 2.3);

    const prompt = `You are a professional video producer. Create a 3-segment video script for a ${duration}-second ${style} video about "${topic}".

    Return ONLY a valid JSON object with this exact structure:
    {
        "title": "Catchy Main Title (max 6 words)",
        "segment1Title": "Scene 1 title (2-4 words)",
        "segment1": "Engaging narration for segment 1 (2-4 sentences)",
        "segment2Title": "Scene 2 title (2-4 words)",
        "segment2": "Key content for segment 2 (2-4 sentences)",
        "segment3Title": "Scene 3 title (2-4 words)",
        "segment3": "Conclusion for segment 3 (2-4 sentences)",
        "cta": "Call to action (max 5 words)",
        "keywords": "3 comma-separated keywords for the topic",
        "imageQueries": [
            "Segment 1 visual A: a specific, cinematic scene (3-5 descriptive words)",
            "Segment 1 visual B: a different angle or related scene (3-5 descriptive words)",
            "Segment 1 visual C: another visual for this segment (3-5 descriptive words)",
            "Segment 2 visual A: a specific scene for this topic (3-5 descriptive words)",
            "Segment 2 visual B: a different perspective (3-5 descriptive words)",
            "Segment 2 visual C: another visual for this segment (3-5 descriptive words)",
            "Segment 3 visual A: a specific scene for conclusion (3-5 descriptive words)",
            "Segment 3 visual B: a different angle (3-5 descriptive words)",
            "Segment 3 visual C: a closing visual (3-5 descriptive words)"
        ]
    }

    RULES:
    - Narration segments will be read aloud as voiceover. Make them sound natural when spoken.
    - STRICT LIMIT: Total word count for all 3 segments MUST be under ${targetWordCount} words.
    - Scale narration length to fit exactly ${duration} seconds total speaking time.
    - imageQueries MUST be exactly 9 items (3 per segment).
    - Each query must describe a CONCRETE, SPECIFIC visual scene for stock photo/video search.
      GOOD: "surgeon operating room close-up", "aerial drone city skyline night", "robot arm assembly factory"
      BAD: "healthcare", "education", "technology"
    - Vary the visuals within each segment — show different angles, perspectives, and subjects related to the narration.
    DO NOT output any text before or after the JSON.`;

    try {
        const msg = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
        });

        const textBlock = msg.content[0];
        if (textBlock.type !== 'text') {
            throw new Error("Unexpected response type from Claude");
        }
        // Strip markdown code fences if present
        let content = textBlock.text.trim();
        if (content.startsWith('```')) {
            content = content.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
        }
        const scriptData = JSON.parse(content);

        scriptData.segment1Title = scriptData.segment1Title || 'Introduction';
        scriptData.segment2Title = scriptData.segment2Title || 'The Story';
        scriptData.segment3Title = scriptData.segment3Title || 'Conclusion';

        console.log("✅ Script Generated!");
        return scriptData;

    } catch (error) {
        console.error("❌ Claude Generation Failed:", error);
        throw error;
    }
}
