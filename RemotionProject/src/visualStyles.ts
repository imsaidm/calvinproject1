/**
 * Visual Style Configuration System
 * Each style defines colors, fonts, intro look, scene overlays, and music.
 */

export interface StyleConfig {
    // Colors
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;

    // Intro
    introGradient: string;
    introGlow: string;

    // Scene
    sceneOverlayGradient: string;
    accentLineGlow: boolean;

    // Typography
    fontFamily: string;
    titleFontWeight: number;

    // Subtitle
    subtitleBg: string;
    subtitleBorder: string;

    // Music
    musicFile: string;

    // Outro
    outroBackground: string;
    outroCta: string;
}

const STYLES: Record<string, StyleConfig> = {
    Documentary: {
        primaryColor: '#1a1a2e',
        accentColor: '#06b6d4',
        backgroundColor: '#0a0a0f',
        introGradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f172a 100%)',
        introGlow: '#06b6d415',
        sceneOverlayGradient: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.85) 100%)',
        accentLineGlow: false,
        fontFamily: "'Georgia', 'Times New Roman', serif",
        titleFontWeight: 700,
        subtitleBg: 'rgba(0, 0, 0, 0.75)',
        subtitleBorder: 'none',
        musicFile: 'documentary.mp3',
        outroBackground: '#0a0a0f',
        outroCta: '#888',
    },

    Cyberpunk: {
        primaryColor: '#ff0055',
        accentColor: '#00ffff',
        backgroundColor: '#0a0014',
        introGradient: 'linear-gradient(135deg, #0a0014 0%, #1a0028 40%, #0d001a 100%)',
        introGlow: '#ff005520',
        sceneOverlayGradient: 'linear-gradient(to bottom, rgba(10,0,20,0) 0%, rgba(10,0,20,0.3) 40%, rgba(10,0,20,0.95) 100%)',
        accentLineGlow: true,
        fontFamily: "'Courier New', 'Consolas', monospace",
        titleFontWeight: 800,
        subtitleBg: 'rgba(10, 0, 20, 0.85)',
        subtitleBorder: '1px solid rgba(0, 255, 255, 0.3)',
        musicFile: 'cyberpunk.mp3',
        outroBackground: '#0a0014',
        outroCta: '#00ffff',
    },

    Minimalist: {
        primaryColor: '#334155',
        accentColor: '#64748b',
        backgroundColor: '#f8fafc',
        introGradient: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
        introGlow: '#33415508',
        sceneOverlayGradient: 'linear-gradient(to bottom, rgba(248,250,252,0) 0%, rgba(248,250,252,0.1) 50%, rgba(0,0,0,0.7) 100%)',
        accentLineGlow: false,
        fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
        titleFontWeight: 500,
        subtitleBg: 'rgba(255, 255, 255, 0.85)',
        subtitleBorder: '1px solid rgba(0,0,0,0.1)',
        musicFile: 'minimalist.mp3',
        outroBackground: '#f8fafc',
        outroCta: '#334155',
    },

    Cinematic: {
        primaryColor: '#0a0a0a',
        accentColor: '#d4a016',
        backgroundColor: '#000000',
        introGradient: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #050505 100%)',
        introGlow: '#d4a01610',
        sceneOverlayGradient: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.92) 100%)',
        accentLineGlow: false,
        fontFamily: "'Georgia', 'Palatino', serif",
        titleFontWeight: 600,
        subtitleBg: 'rgba(0, 0, 0, 0.8)',
        subtitleBorder: 'none',
        musicFile: 'cinematic.mp3',
        outroBackground: '#000000',
        outroCta: '#d4a016',
    },

    ExplainLikeIm5: {
        primaryColor: '#8b5cf6',
        accentColor: '#fbbf24',
        backgroundColor: '#1e1b4b',
        introGradient: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 40%, #f97316 100%)',
        introGlow: '#8b5cf620',
        sceneOverlayGradient: 'linear-gradient(to bottom, rgba(30,27,75,0) 0%, rgba(30,27,75,0.3) 50%, rgba(30,27,75,0.9) 100%)',
        accentLineGlow: true,
        fontFamily: "'Segoe UI', 'Arial Rounded MT Bold', sans-serif",
        titleFontWeight: 800,
        subtitleBg: 'rgba(30, 27, 75, 0.85)',
        subtitleBorder: '2px solid rgba(251, 191, 36, 0.4)',
        musicFile: 'animated.mp3',
        outroBackground: '#1e1b4b',
        outroCta: '#fbbf24',
    },
};

/**
 * Get style configuration by name. Falls back to Documentary if unknown.
 */
export function getStyleConfig(styleName: string): StyleConfig {
    return STYLES[styleName] || STYLES.Documentary;
}

/**
 * Get all available style names.
 */
export function getStyleNames(): string[] {
    return Object.keys(STYLES);
}
