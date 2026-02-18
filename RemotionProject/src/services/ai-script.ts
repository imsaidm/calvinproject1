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
    const sentencesPerSegment = duration >= 90 ? '5-8' : duration >= 60 ? '4-6' : '3-5';

    const prompt = `You are an award-winning documentary filmmaker and storyteller. Create a compelling 3-segment video script for a ${duration}-second ${style} video about "${topic}".

YOUR SCRIPT MUST TELL A STORY — not just list facts. Follow this narrative structure:
- Segment 1 (THE HOOK): Open with a surprising fact, dramatic question, or vivid scene that grabs attention immediately. Set the stage. Introduce the subject with specificity — use real names, places, dates, and numbers when possible.
- Segment 2 (THE JOURNEY): This is the meat. Reveal the conflict, challenge, or fascinating details. Build tension or curiosity. Use vivid, sensory language — describe what we SEE, HEAR, FEEL. Make the audience care.
- Segment 3 (THE PAYOFF): Deliver the resolution, surprising twist, or powerful conclusion. End with emotional impact — inspiration, wonder, or a thought-provoking insight.

Return ONLY a valid JSON object with this exact structure:
{
    "title": "Catchy, Click-worthy Title (max 8 words)",
    "segment1Title": "Scene 1 title (2-4 words)",
    "segment1": "Hook narration (${sentencesPerSegment} sentences). MUST start with something attention-grabbing.",
    "segment2Title": "Scene 2 title (2-4 words)",
    "segment2": "Journey narration (${sentencesPerSegment} sentences). Build the story with vivid details.",
    "segment3Title": "Scene 3 title (2-4 words)",
    "segment3": "Payoff narration (${sentencesPerSegment} sentences). Deliver emotional impact.",
    "cta": "Call to action (max 5 words)",
    "keywords": "5 comma-separated specific keywords",
    "imageQueries": [
        "query1", "query2", "query3",
        "query4", "query5", "query6",
        "query7", "query8", "query9"
    ]
}

NARRATION RULES:
- This will be READ ALOUD as voiceover. Write conversationally — short punchy sentences mixed with flowing ones.
- Use SPECIFIC details: "a 47-year-old farmer in rural Wisconsin" NOT "a farmer". "The Amazon rainforest loses 17 trees per second" NOT "deforestation is bad".
- Create EMOTION: wonder, surprise, urgency, humor, or drama. Make the viewer FEEL something.
- STRICT LIMIT: Total narration (segment1 + segment2 + segment3) MUST be approximately ${targetWordCount} words to fill ${duration} seconds.
- NO generic filler phrases like "In conclusion" or "As we can see". Every sentence must earn its place.

IMAGE QUERY RULES:
- MUST be exactly 9 items (3 per segment), matching the narration content.
- Each query MUST be 5-8 descriptive words painting a SPECIFIC visual scene.
- GOOD: "elderly fisherman casting net golden sunset river", "close-up weathered hands holding fresh catch", "aerial view vast green dairy farm rolling hills"
- BAD: "fishing", "farm", "nature scene", "technology"
- Each query within a segment should show DIFFERENT perspectives: wide shot, close-up, action, detail, environment.
- Queries must match what the narration is actually describing — if you mention Wisconsin farmland, the query should show Wisconsin-style farmland.

DO NOT output any text before or after the JSON.`;

    try {
        const msg = await anthropic.messages.create({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 2048,
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

        scriptData.segment1Title = scriptData.segment1Title || 'The Beginning';
        scriptData.segment2Title = scriptData.segment2Title || 'The Journey';
        scriptData.segment3Title = scriptData.segment3Title || 'The Revelation';

        console.log("✅ Script Generated!");
        return scriptData;

    } catch (error) {
        console.error("❌ Claude Generation Failed:", error);
        throw error;
    }
}
