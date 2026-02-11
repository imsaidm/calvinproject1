import React from 'react';
import { AbsoluteFill, Audio, Img, useVideoConfig, useCurrentFrame, interpolate, Sequence, staticFile } from 'remotion';
import { z } from 'zod';
import { CinematicBackground } from './Slideshow';
import { Subtitles, generateSubtitleEntries, type SubtitleEntry } from './Subtitles';

// Segment data schema - Single image per scene
const SegmentSchema = z.object({
    title: z.string(),
    narration: z.string(),
    imageUrl: z.string()
});

// Subtitle timestamp chunk schema (from Whisper)
const SubtitleTimestampSchema = z.object({
    text: z.string(),
    startTime: z.number(),
    endTime: z.number()
});

// Main Video Schema
export const VideoSchema = z.object({
    title: z.string(),
    script: z.string().optional(),
    voiceoverUrl: z.string().optional(),
    durationInSeconds: z.number().default(30),
    // Timing Metadata
    introDuration: z.number().default(3),
    outroDuration: z.number().default(3),
    voiceDuration: z.number().optional(),
    // Branding
    primaryColor: z.string().default('#ff0055'),
    accentColor: z.string().default('#22c55e'),
    cta: z.string().default('Watch Now'),
    logo: z.string().optional(),
    // Audio
    musicUrl: z.string().optional(),
    // Captions
    enableCaptions: z.boolean().default(true),
    captionScript: z.string().optional(),
    // Whisper-based subtitle timestamps
    subtitleTimestamps: z.array(SubtitleTimestampSchema).optional(),
    // Scene-based segments
    segments: z.array(SegmentSchema).optional()
});

// ============================================================
// SCENE COMPONENT - Clean Documentary Style
// ============================================================
const Scene: React.FC<{
    sceneTitle: string;
    imageUrl: string;
    sceneIndex: number;
    sceneDuration: number;
    primaryColor: string;
    accentColor: string;
}> = ({ sceneTitle, imageUrl, sceneIndex, sceneDuration, primaryColor, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const totalSceneFrames = sceneDuration * fps;

    // --- ANIMATIONS ---
    // Smooth cross-dissolve (fade in first 0.5s)
    const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });

    // Title slide up + fade
    const titleY = interpolate(frame, [0, fps], [20, 0], { extrapolateRight: 'clamp' });
    const titleOpacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });

    // Decorative line expand
    const lineWidth = interpolate(frame, [fps * 0.2, fps * 1.2], [0, 100], { extrapolateRight: 'clamp' });

    // Vary Ken Burns direction based on scene index
    const directions = ['up', 'right', 'left', 'down'] as const;
    const direction = directions[sceneIndex % directions.length];

    return (
        <AbsoluteFill style={{ opacity: fadeIn }}>
            {/* Background: Cinematic Single Image */}
            <CinematicBackground
                imageUrl={imageUrl}
                durationInSeconds={sceneDuration}
                direction={direction}
            />

            {/* Cinematic Gradient Overlay (Darker at bottom for text) */}
            <AbsoluteFill style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.9) 100%)'
            }} />

            {/* Lower Third Content */}
            <AbsoluteFill style={{
                justifyContent: 'flex-end',
                padding: '0 60px 80px 60px'
            }}>
                {/* Scene Title Group */}
                <div style={{
                    transform: `translateY(${titleY}px)`,
                    opacity: titleOpacity
                }}>
                    {/* Animated Accent Line */}
                    <div style={{
                        width: `${lineWidth}px`,
                        height: 4,
                        backgroundColor: accentColor,
                        marginBottom: 16,
                        boxShadow: `0 0 10px ${accentColor}88`
                    }} />

                    {/* Scene Title */}
                    <h2 style={{
                        fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                        fontSize: 56,
                        fontWeight: 600,
                        color: 'white',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                        {sceneTitle}
                    </h2>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================================
// INTRO SCREEN - Elegant & Cinematic
// ============================================================
const IntroScreen: React.FC<{
    title: string;
    primaryColor: string;
    accentColor: string;
}> = ({ title, primaryColor, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Slow zoom out
    const scale = interpolate(frame, [0, fps * 4], [1.1, 1], { extrapolateRight: 'clamp' });

    // Text Reveal
    const opacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
    const translateY = interpolate(frame, [0, fps], [30, 0], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{
            background: 'linear-gradient(135deg, #050505 0%, #1a1a1a 100%)',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
        }}>
            {/* Ambient Animated Background Glow */}
            <div style={{
                position: 'absolute',
                top: '-50%',
                left: '-50%',
                width: '200%',
                height: '200%',
                background: `radial-gradient(circle at 50% 50%, ${primaryColor}15 0%, transparent 60%)`,
                transform: `scale(${scale})`,
                opacity: 0.8
            }} />

            {/* Main Title */}
            <div style={{
                textAlign: 'center',
                opacity,
                transform: `translateY(${translateY}px)`,
                zIndex: 10
            }}>
                <h1 style={{
                    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: 80,
                    fontWeight: 800,
                    color: 'white',
                    margin: '0 0 20px 0',
                    lineHeight: 1.1,
                    maxWidth: '80vw',
                    textShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    {title}
                </h1>

                {/* Underline */}
                <div style={{
                    width: 120,
                    height: 6,
                    background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
                    margin: '0 auto',
                    borderRadius: 3
                }} />
            </div>
        </AbsoluteFill>
    );
};

// ============================================================
// OUTRO SCREEN - Minimalist Call to Action
// ============================================================
const OutroScreen: React.FC<{
    cta: string;
    title: string;
    primaryColor: string;
    accentColor: string;
}> = ({ cta, title, primaryColor, accentColor }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
    const scale = interpolate(frame, [0, fps], [0.95, 1], { extrapolateRight: 'clamp' });

    return (
        <AbsoluteFill style={{
            background: '#050505',
            justifyContent: 'center',
            alignItems: 'center',
            opacity
        }}>
            {/* Simple Background Gradient */}
            <AbsoluteFill style={{
                background: `radial-gradient(circle at 50% 50%, ${primaryColor}08 0%, transparent 70%)`
            }} />

            <div style={{
                textAlign: 'center',
                transform: `scale(${scale})`
            }}>
                <p style={{
                    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: 32,
                    color: '#888',
                    margin: '0 0 24px 0',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                }}>
                    Thanks for watching
                </p>

                <h2 style={{
                    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
                    fontSize: 64,
                    fontWeight: 700,
                    color: 'white',
                    margin: 0,
                    textShadow: `0 0 30px ${primaryColor}44`
                }}>
                    {cta}
                </h2>

                {/* Accent Dot */}
                <div style={{
                    width: 12,
                    height: 12,
                    backgroundColor: accentColor,
                    borderRadius: '50%',
                    margin: '30px auto 0 auto',
                    boxShadow: `0 0 15px ${accentColor}`
                }} />
            </div>
        </AbsoluteFill>
    );
};

// ============================================================
// MAIN COMPOSITION
// ============================================================
export const MyComposition: React.FC<z.infer<typeof VideoSchema>> = ({
    title,
    script,
    voiceoverUrl,
    primaryColor = '#ff0055',
    accentColor = '#22c55e',
    cta = 'Watch Now',
    logo,
    musicUrl,
    enableCaptions = true,
    captionScript,
    subtitleTimestamps,
    segments,
    durationInSeconds,
    introDuration = 3,
    outroDuration = 3,
    voiceDuration
}) => {
    const { fps } = useVideoConfig();

    // Calculate content timing
    const contentSeconds = durationInSeconds - introDuration - outroDuration;
    const segmentSeconds = contentSeconds / 3;

    // Generate subtitle entries
    const subtitleEntries: SubtitleEntry[] = React.useMemo(() => {
        if (!enableCaptions) return [];

        // PRIORITY 1: Use Whisper word-level timestamps (most accurate)
        if (subtitleTimestamps && subtitleTimestamps.length > 0) {
            console.log(`📝 Using ${subtitleTimestamps.length} Whisper-timed subtitle chunks`);
            return subtitleTimestamps.map(chunk => ({
                text: chunk.text,
                // Offset by introDuration since Whisper timestamps start at 0
                startFrame: Math.round((introDuration + chunk.startTime) * fps),
                endFrame: Math.round((introDuration + chunk.endTime) * fps),
            }));
        }

        // PRIORITY 2: Fallback to even distribution
        const textForCaptions = captionScript || script || '';
        const actualContentDuration = voiceDuration ? Math.min(voiceDuration + 1, contentSeconds) : contentSeconds;
        return generateSubtitleEntries(
            textForCaptions,
            introDuration,
            introDuration + actualContentDuration,
            fps
        );
    }, [enableCaptions, captionScript, script, introDuration, outroDuration, fps, voiceDuration, contentSeconds, subtitleTimestamps]);

    // Fallback if no segments provided (legacy mode support)
    const activeSegments = segments && segments.length === 3 ? segments : [
        { title: 'Part 1', narration: 'Content missing', imageUrl: 'https://picsum.photos/seed/1/1600/900' },
        { title: 'Part 2', narration: 'Content missing', imageUrl: 'https://picsum.photos/seed/2/1600/900' },
        { title: 'Part 3', narration: 'Content missing', imageUrl: 'https://picsum.photos/seed/3/1600/900' }
    ];

    // Frame Calculations
    const introFrames = Math.round(introDuration * fps);
    const segmentFrames = Math.round(segmentSeconds * fps);
    const outroFrames = Math.round(outroDuration * fps);

    return (
        <AbsoluteFill style={{ backgroundColor: '#050505' }}>
            {/* Audio Layers - Using staticFile for safety */}
            {musicUrl && (
                <Audio src={staticFile(musicUrl.replace(/^\//, ''))} volume={0.15} loop />
            )}
            {voiceoverUrl && (
                <Sequence from={introFrames}>
                    <Audio src={staticFile(voiceoverUrl.replace(/^\//, ''))} />
                </Sequence>
            )}

            {/* Logo Watermark */}
            {logo && (
                <Img src={staticFile(logo.replace(/^\//, ''))} style={{
                    position: 'absolute', top: 50, left: 50,
                    width: 100, opacity: 0.6, zIndex: 100
                }} />
            )}

            {/* --- SEQUENCE 1: INTRO --- */}
            <Sequence from={0} durationInFrames={introFrames}>
                <IntroScreen
                    title={title}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                />
            </Sequence>

            {/* --- SEQUENCE 2: SCENE 1 --- */}
            <Sequence from={introFrames} durationInFrames={segmentFrames}>
                <Scene
                    sceneTitle={activeSegments[0].title}
                    imageUrl={activeSegments[0].imageUrl}
                    sceneIndex={0}
                    sceneDuration={segmentSeconds}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                />
            </Sequence>

            {/* --- SEQUENCE 3: SCENE 2 --- */}
            <Sequence from={introFrames + segmentFrames} durationInFrames={segmentFrames}>
                <Scene
                    sceneTitle={activeSegments[1].title}
                    imageUrl={activeSegments[1].imageUrl}
                    sceneIndex={1}
                    sceneDuration={segmentSeconds}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                />
            </Sequence>

            {/* --- SEQUENCE 4: SCENE 3 --- */}
            <Sequence from={introFrames + segmentFrames * 2} durationInFrames={segmentFrames}>
                <Scene
                    sceneTitle={activeSegments[2].title}
                    imageUrl={activeSegments[2].imageUrl}
                    sceneIndex={2}
                    sceneDuration={segmentSeconds}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                />
            </Sequence>

            {/* --- SEQUENCE 5: OUTRO --- */}
            <Sequence from={introFrames + segmentFrames * 3} durationInFrames={outroFrames}>
                <OutroScreen
                    cta={cta}
                    title={title}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                />
            </Sequence>

            {/* --- OVERLAY: SUBTITLES --- */}
            {enableCaptions && (
                <Subtitles subtitles={subtitleEntries} primaryColor={primaryColor} />
            )}
        </AbsoluteFill>
    );
};
