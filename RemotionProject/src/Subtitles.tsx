import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export interface SubtitleEntry {
    text: string;
    startFrame: number;
    endFrame: number;
}

/**
 * Generates timed subtitle entries from a full script text.
 * Subtitles only appear within the content window (after intro, before outro).
 */
export function generateSubtitleEntries(
    fullScript: string,
    contentStartSeconds: number,
    contentEndSeconds: number,
    fps: number
): SubtitleEntry[] {
    if (!fullScript || fullScript.trim().length === 0) return [];

    const words = fullScript.replace(/\n/g, ' ').split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    const WORDS_PER_CHUNK = 6;
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += WORDS_PER_CHUNK) {
        chunks.push(words.slice(i, i + WORDS_PER_CHUNK).join(' '));
    }

    const startFrame = Math.round(contentStartSeconds * fps);
    const endFrame = Math.round(contentEndSeconds * fps);

    // Small padding at start (0.5s) and end (0.5s)
    const padFrames = Math.round(fps * 0.5);
    const effectiveStart = startFrame + padFrames;
    const effectiveEnd = endFrame - padFrames;
    const effectiveFrames = effectiveEnd - effectiveStart;

    if (effectiveFrames <= 0) return [];

    const framesPerChunk = Math.floor(effectiveFrames / chunks.length);
    if (framesPerChunk <= 0) return [];

    return chunks.map((text, index) => ({
        text,
        startFrame: effectiveStart + index * framesPerChunk,
        endFrame: effectiveStart + (index + 1) * framesPerChunk,
    }));
}

export const Subtitles: React.FC<{
    subtitles: SubtitleEntry[];
    primaryColor?: string;
    subtitleBg?: string;
    subtitleBorder?: string;
    fontFamily?: string;
    isLight?: boolean;
}> = ({ subtitles, primaryColor = '#ff0055', subtitleBg, subtitleBorder, fontFamily, isLight }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const currentSub = subtitles.find(
        (s) => frame >= s.startFrame && frame < s.endFrame
    );

    if (!currentSub) return null;

    // Prevent fade overlap if subtitle is very short
    const duration = currentSub.endFrame - currentSub.startFrame;
    const maxFade = Math.floor(duration / 2);

    const fadeInDuration = Math.min(fps * 0.3, 10, maxFade);
    const fadeOutDuration = Math.min(fps * 0.3, 10, maxFade);

    const opacity = interpolate(
        frame,
        [
            currentSub.startFrame,
            currentSub.startFrame + fadeInDuration,
            currentSub.endFrame - fadeOutDuration,
            currentSub.endFrame,
        ],
        [0, 1, 1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <AbsoluteFill
            style={{
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingTop: 60,
                zIndex: 200,
            }}
        >
            <div
                style={{
                    opacity,
                    backgroundColor: subtitleBg || 'rgba(0, 0, 0, 0.7)',
                    border: subtitleBorder || 'none',
                    padding: '14px 28px',
                    borderRadius: 6,
                    maxWidth: '75%',
                }}
            >
                <p
                    style={{
                        fontFamily: fontFamily || "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                        fontSize: 42,
                        color: isLight ? '#1e293b' : 'white',
                        margin: 0,
                        textAlign: 'center',
                        lineHeight: 1.4,
                        textShadow: isLight ? 'none' : '0 1px 4px rgba(0,0,0,0.4)',
                    }}
                >
                    {currentSub.text}
                </p>
            </div>
        </AbsoluteFill>
    );
};
