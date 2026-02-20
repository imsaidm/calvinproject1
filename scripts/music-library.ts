/**
 * Music Library - No-copyright music tracks organized by style/mood
 * 
 * All tracks are stored locally in assets/music/.
 * Each style maps to compatible music tracks for preview and selection.
 * Every track includes copyright verification metadata.
 * 
 * To add more tracks, download royalty-free music from Pixabay and add entries below.
 * Run `npx ts-node scripts/download-music.ts --list` to see available Pixabay tracks.
 */

export interface MusicTrack {
    id: string;
    name: string;
    file: string;        // filename in assets/music/
    mood: string;
    bpm: string;         // tempo descriptor
    styles: string[];    // compatible visual styles
    // Copyright metadata
    license: string;         // e.g. "Pixabay License", "CC0", "Royalty-Free"
    source: string;          // e.g. "Pixabay", "FreePD", "Custom"
    sourceUrl: string;       // link to original source/license page
    copyrightSafe: boolean;  // true = verified safe for YouTube monetization
}

// Core music catalog — each track can match multiple styles
export const MUSIC_TRACKS: MusicTrack[] = [
    // ── CALM / AMBIENT ───────────────────────────────────────────
    {
        id: 'documentary',
        name: 'Ambient Discovery',
        file: 'documentary.mp3',
        mood: 'Calm & Thoughtful',
        bpm: 'Slow',
        styles: ['Documentary', 'NatureDocs', 'Minimalist'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'ambient-piano',
        name: 'Soft Piano Dreams',
        file: 'ambient-piano.mp3',
        mood: 'Reflective & Gentle',
        bpm: 'Slow',
        styles: ['Documentary', 'Minimalist', 'NatureDocs'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'nature-ambience',
        name: 'Forest Meditation',
        file: 'nature-ambience.mp3',
        mood: 'Peaceful & Organic',
        bpm: 'Slow',
        styles: ['NatureDocs', 'Documentary', 'Minimalist'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'calm-acoustic',
        name: 'Gentle Sunrise',
        file: 'calm-acoustic.mp3',
        mood: 'Warm & Soothing',
        bpm: 'Slow',
        styles: ['Documentary', 'NatureDocs', 'Minimalist'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },

    // ── CINEMATIC / DRAMATIC ──────────────────────────────────────
    {
        id: 'cinematic',
        name: 'Epic Cinematic',
        file: 'cinematic.mp3',
        mood: 'Grand & Dramatic',
        bpm: 'Medium',
        styles: ['Cinematic', 'Horror', 'Documentary'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'cinematic-tension',
        name: 'Dark Horizon',
        file: 'cinematic-tension.mp3',
        mood: 'Suspenseful & Intense',
        bpm: 'Slow',
        styles: ['Cinematic', 'Horror', 'Documentary'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'orchestral-rise',
        name: 'Victory March',
        file: 'orchestral-rise.mp3',
        mood: 'Triumphant & Powerful',
        bpm: 'Medium',
        styles: ['Cinematic', 'Documentary'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'horror-drone',
        name: 'Whispers in Shadow',
        file: 'horror-drone.mp3',
        mood: 'Eerie & Unsettling',
        bpm: 'Slow',
        styles: ['Horror', 'Cinematic'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },

    // ── ELECTRONIC / FUTURISTIC ───────────────────────────────────
    {
        id: 'cyberpunk',
        name: 'Neon Pulse',
        file: 'cyberpunk.mp3',
        mood: 'Electronic & Futuristic',
        bpm: 'Fast',
        styles: ['Cyberpunk', 'TechReview'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'synthwave',
        name: 'Retrowave Drive',
        file: 'synthwave.mp3',
        mood: 'Retro & Energetic',
        bpm: 'Fast',
        styles: ['Cyberpunk', 'TechReview'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'tech-ambient',
        name: 'Digital Dreamscape',
        file: 'tech-ambient.mp3',
        mood: 'Clean & Techy',
        bpm: 'Medium',
        styles: ['TechReview', 'Cyberpunk', 'Minimalist'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'electronic-chill',
        name: 'Code Flow',
        file: 'electronic-chill.mp3',
        mood: 'Smooth & Modern',
        bpm: 'Medium',
        styles: ['TechReview', 'Cyberpunk', 'Minimalist'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },

    // ── MINIMAL / LOFI ────────────────────────────────────────────
    {
        id: 'minimalist',
        name: 'Lo-Fi Chill',
        file: 'minimalist.mp3',
        mood: 'Minimal & Clean',
        bpm: 'Slow',
        styles: ['Minimalist', 'Documentary'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'lofi-beats',
        name: 'Midnight Study',
        file: 'lofi-beats.mp3',
        mood: 'Chill & Relaxed',
        bpm: 'Slow',
        styles: ['Minimalist', 'Documentary', 'NatureDocs'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'soft-corporate',
        name: 'Clean Presentation',
        file: 'soft-corporate.mp3',
        mood: 'Professional & Light',
        bpm: 'Medium',
        styles: ['Minimalist', 'TechReview', 'Documentary'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },

    // ── UPBEAT / FUN ──────────────────────────────────────────────
    {
        id: 'animated',
        name: 'Playful Pop',
        file: 'animated.mp3',
        mood: 'Fun & Upbeat',
        bpm: 'Fast',
        styles: ['ExplainLikeIm5'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'happy-ukulele',
        name: 'Sunny Adventure',
        file: 'happy-ukulele.mp3',
        mood: 'Cheerful & Bright',
        bpm: 'Medium',
        styles: ['ExplainLikeIm5', 'NatureDocs'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'quirky-fun',
        name: 'Cartoon Bounce',
        file: 'quirky-fun.mp3',
        mood: 'Playful & Silly',
        bpm: 'Fast',
        styles: ['ExplainLikeIm5'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'kids-adventure',
        name: 'Magic Playground',
        file: 'kids-adventure.mp3',
        mood: 'Whimsical & Exciting',
        bpm: 'Medium',
        styles: ['ExplainLikeIm5', 'NatureDocs'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },

    // ── INSPIRATIONAL / UPLIFTING ─────────────────────────────────
    {
        id: 'inspirational',
        name: 'Rising Hope',
        file: 'inspirational.mp3',
        mood: 'Uplifting & Inspiring',
        bpm: 'Medium',
        styles: ['Documentary', 'NatureDocs', 'Cinematic', 'Minimalist'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'motivational',
        name: 'Break Through',
        file: 'motivational.mp3',
        mood: 'Determined & Bold',
        bpm: 'Medium',
        styles: ['Documentary', 'Cinematic', 'TechReview'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    },
    {
        id: 'uplifting-indie',
        name: 'New Beginnings',
        file: 'uplifting-indie.mp3',
        mood: 'Hopeful & Fresh',
        bpm: 'Medium',
        styles: ['NatureDocs', 'Documentary', 'Minimalist', 'ExplainLikeIm5'],
        license: 'Pixabay Content License — royalty-free, no attribution required',
        source: 'Pixabay',
        sourceUrl: 'https://pixabay.com/music/',
        copyrightSafe: true
    }
];

/**
 * Get compatible music tracks for a given visual style.
 * Returns tracks where the style is listed.
 */
export function getTracksForStyle(styleName: string): MusicTrack[] {
    const tracks = MUSIC_TRACKS.filter(track => track.styles.includes(styleName));
    // If no tracks match the style, return all tracks as fallback
    return tracks.length > 0 ? tracks : MUSIC_TRACKS;
}

/**
 * Get a track by its ID.
 */
export function getTrackById(id: string): MusicTrack | undefined {
    return MUSIC_TRACKS.find(track => track.id === id);
}

/**
 * Get the default track for a style (first matching track).
 */
export function getDefaultTrack(styleName: string): MusicTrack {
    const tracks = getTracksForStyle(styleName);
    return tracks[0] || MUSIC_TRACKS[0];
}

/**
 * Get a RANDOM compatible track for a style.
 * This is used by the orchestrator to add variety to auto-generated videos.
 */
export function getRandomTrackForStyle(styleName: string): MusicTrack {
    const tracks = getTracksForStyle(styleName);
    return tracks[Math.floor(Math.random() * tracks.length)];
}

/**
 * Get tracks that actually have files present in assets/music/.
 * Used to filter the library to only show downloadable/playable tracks.
 */
export function getAvailableTracks(): MusicTrack[] {
    const fs = require('fs');
    const path = require('path');
    const musicDir = path.join(process.cwd(), 'assets', 'music');

    return MUSIC_TRACKS.filter(track => {
        const filePath = path.join(musicDir, track.file);
        return fs.existsSync(filePath);
    });
}

/**
 * Get tracks that are in the catalog but missing from disk.
 * Useful for knowing what needs to be downloaded.
 */
export function getMissingTracks(): MusicTrack[] {
    const fs = require('fs');
    const path = require('path');
    const musicDir = path.join(process.cwd(), 'assets', 'music');

    return MUSIC_TRACKS.filter(track => {
        const filePath = path.join(musicDir, track.file);
        return !fs.existsSync(filePath);
    });
}
