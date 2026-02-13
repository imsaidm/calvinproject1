/**
 * Music Library - No-copyright music tracks organized by style/mood
 * 
 * All tracks are stored locally in assets/music/.
 * Each style maps to compatible music tracks for preview and selection.
 */

export interface MusicTrack {
    id: string;
    name: string;
    file: string;        // filename in assets/music/
    mood: string;
    bpm: string;         // tempo descriptor
    styles: string[];    // compatible visual styles
}

// Core music catalog — each track can match multiple styles
export const MUSIC_TRACKS: MusicTrack[] = [
    {
        id: 'documentary',
        name: 'Ambient Discovery',
        file: 'documentary.mp3',
        mood: 'Calm & Thoughtful',
        bpm: 'Slow',
        styles: ['Documentary', 'NatureDocs']
    },
    {
        id: 'cinematic',
        name: 'Epic Cinematic',
        file: 'cinematic.mp3',
        mood: 'Grand & Dramatic',
        bpm: 'Medium',
        styles: ['Cinematic', 'Horror']
    },
    {
        id: 'cyberpunk',
        name: 'Neon Pulse',
        file: 'cyberpunk.mp3',
        mood: 'Electronic & Futuristic',
        bpm: 'Fast',
        styles: ['Cyberpunk', 'TechReview']
    },
    {
        id: 'minimalist',
        name: 'Lo-Fi Chill',
        file: 'minimalist.mp3',
        mood: 'Minimal & Clean',
        bpm: 'Slow',
        styles: ['Minimalist']
    },
    {
        id: 'animated',
        name: 'Playful Pop',
        file: 'animated.mp3',
        mood: 'Fun & Upbeat',
        bpm: 'Fast',
        styles: ['ExplainLikeIm5']
    },
    {
        id: 'inspirational',
        name: 'Rising Hope',
        file: 'inspirational.mp3',
        mood: 'Uplifting & Inspiring',
        bpm: 'Medium',
        styles: ['Documentary', 'NatureDocs', 'Cinematic', 'Minimalist']
    }
];

/**
 * Get compatible music tracks for a given visual style.
 * Returns tracks where the style is listed + any universal tracks.
 */
export function getTracksForStyle(styleName: string): MusicTrack[] {
    return MUSIC_TRACKS.filter(track => track.styles.includes(styleName));
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
