import React from 'react';
import { AbsoluteFill, Audio, Img, useVideoConfig, useCurrentFrame, interpolate, Sequence, staticFile } from 'remotion';
import { z } from 'zod';
import { CinematicBackground } from './Slideshow';
import { Subtitles, generateSubtitleEntries, type SubtitleEntry } from './Subtitles';
import { getStyleConfig, type StyleConfig } from './visualStyles';

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
    segments: z.array(SegmentSchema).optional(),
    // Visual Style
    visualStyle: z.string().default('Documentary')
});

// ============================================================
// SCENE COMPONENT - Style-Aware
// ============================================================
const Scene: React.FC<{
    sceneTitle: string;
    imageUrl: string;
    sceneIndex: number;
    sceneDuration: number;
    primaryColor: string;
    accentColor: string;
    style: StyleConfig;
}> = ({ sceneTitle, imageUrl, sceneIndex, sceneDuration, primaryColor, accentColor, style }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // --- ANIMATIONS ---
    const fadeIn = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
    const titleY = interpolate(frame, [0, fps], [20, 0], { extrapolateRight: 'clamp' });
    const titleOpacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
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

            {/* Style-specific Gradient Overlay */}
            <AbsoluteFill style={{
                background: style.sceneOverlayGradient
            }} />

            {/* Lower Third Content - RIGHT aligned */}
            <AbsoluteFill style={{
                justifyContent: 'flex-end',
                alignItems: 'flex-end',
                padding: '0 60px 80px 60px'
            }}>
                {/* Scene Title Group */}
                <div style={{
                    transform: `translateY(${titleY}px)`,
                    opacity: titleOpacity,
                    textAlign: 'right'
                }}>
                    {/* Animated Accent Line - right aligned */}
                    <div style={{
                        width: `${lineWidth}px`,
                        height: 4,
                        backgroundColor: accentColor,
                        marginBottom: 16,
                        marginLeft: 'auto',
                        boxShadow: style.accentLineGlow ? `0 0 15px ${accentColor}, 0 0 30px ${accentColor}55` : `0 0 10px ${accentColor}88`,
                        borderRadius: 2
                    }} />

                    {/* Scene Title */}
                    <h2 style={{
                        fontFamily: style.fontFamily,
                        fontSize: 56,
                        fontWeight: style.titleFontWeight,
                        color: 'white',
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        textShadow: style.accentLineGlow
                            ? `0 0 20px ${accentColor}66, 0 2px 10px rgba(0,0,0,0.5)`
                            : '0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                        {sceneTitle}
                    </h2>
                </div>
            </AbsoluteFill>
        </AbsoluteFill>
    );
};

// ============================================================
// INTRO SCREEN - Style-Aware
// ============================================================
const IntroScreen: React.FC<{
    title: string;
    primaryColor: string;
    accentColor: string;
    style: StyleConfig;
    visualStyleName: string;
}> = ({ title, primaryColor, accentColor, style, visualStyleName }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Slow zoom out
    const scale = interpolate(frame, [0, fps * 4], [1.1, 1], { extrapolateRight: 'clamp' });

    // Text Reveal
    const opacity = interpolate(frame, [0, fps], [0, 1], { extrapolateRight: 'clamp' });
    const translateY = interpolate(frame, [0, fps], [30, 0], { extrapolateRight: 'clamp' });

    // Minimalist: dark text on light bg
    const isLight = visualStyleName === 'Minimalist';
    const textColor = isLight ? '#1e293b' : 'white';

    // Cyberpunk scanline effect
    const scanlineY = interpolate(frame, [0, fps * 3], [0, 1080], { extrapolateRight: 'extend' });

    return (
        <AbsoluteFill style={{
            background: style.introGradient,
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
                background: `radial-gradient(circle at 50% 50%, ${style.introGlow} 0%, transparent 60%)`,
                transform: `scale(${scale})`,
                opacity: 0.8
            }} />

            {/* Cyberpunk: Scanlines */}
            {visualStyleName === 'Cyberpunk' && (
                <>
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)`,
                        zIndex: 1
                    }} />
                    <div style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        top: scanlineY % 1080,
                        height: 2,
                        backgroundColor: 'rgba(0,255,255,0.15)',
                        boxShadow: '0 0 20px rgba(0,255,255,0.3)',
                        zIndex: 2
                    }} />
                </>
            )}

            {/* Cinematic: Letterbox bars */}
            {visualStyleName === 'Cinematic' && (
                <>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: 80, backgroundColor: '#000', zIndex: 5
                    }} />
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: 80, backgroundColor: '#000', zIndex: 5
                    }} />
                </>
            )}

            {/* Main Title */}
            <div style={{
                textAlign: 'center',
                opacity,
                transform: `translateY(${translateY}px)`,
                zIndex: 10
            }}>
                <h1 style={{
                    fontFamily: style.fontFamily,
                    fontSize: visualStyleName === 'Minimalist' ? 64 : 80,
                    fontWeight: style.titleFontWeight,
                    color: textColor,
                    margin: '0 0 20px 0',
                    lineHeight: 1.1,
                    maxWidth: '80vw',
                    textShadow: visualStyleName === 'Cyberpunk'
                        ? `0 0 30px ${accentColor}88, 0 0 60px ${primaryColor}44`
                        : isLight
                            ? 'none'
                            : '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    {title}
                </h1>

                {/* Underline */}
                <div style={{
                    width: visualStyleName === 'Minimalist' ? 60 : 120,
                    height: visualStyleName === 'Minimalist' ? 2 : 6,
                    background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`,
                    margin: '0 auto',
                    borderRadius: 3,
                    boxShadow: style.accentLineGlow ? `0 0 15px ${accentColor}` : 'none'
                }} />
            </div>
        </AbsoluteFill>
    );
};

// ============================================================
// OUTRO SCREEN - Style-Aware
// ============================================================
const OutroScreen: React.FC<{
    cta: string;
    title: string;
    primaryColor: string;
    accentColor: string;
    style: StyleConfig;
    visualStyleName: string;
}> = ({ cta, title, primaryColor, accentColor, style, visualStyleName }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });
    const scale = interpolate(frame, [0, fps], [0.95, 1], { extrapolateRight: 'clamp' });

    const isLight = visualStyleName === 'Minimalist';
    const thanksColor = isLight ? '#94a3b8' : style.outroCta;
    const ctaColor = isLight ? '#1e293b' : 'white';

    return (
        <AbsoluteFill style={{
            background: style.outroBackground,
            justifyContent: 'center',
            alignItems: 'center',
            opacity
        }}>
            {/* Background Gradient */}
            <AbsoluteFill style={{
                background: `radial-gradient(circle at 50% 50%, ${style.introGlow} 0%, transparent 70%)`
            }} />

            {/* Cinematic: Letterbox bars */}
            {visualStyleName === 'Cinematic' && (
                <>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: 80, backgroundColor: '#000', zIndex: 5
                    }} />
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: 80, backgroundColor: '#000', zIndex: 5
                    }} />
                </>
            )}

            {/* Cyberpunk: Scanlines */}
            {visualStyleName === 'Cyberpunk' && (
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px)`,
                    zIndex: 1
                }} />
            )}

            <div style={{
                textAlign: 'center',
                transform: `scale(${scale})`,
                zIndex: 10
            }}>
                <p style={{
                    fontFamily: style.fontFamily,
                    fontSize: 32,
                    color: thanksColor,
                    margin: '0 0 24px 0',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase'
                }}>
                    Thanks for watching
                </p>

                <h2 style={{
                    fontFamily: style.fontFamily,
                    fontSize: 64,
                    fontWeight: style.titleFontWeight,
                    color: ctaColor,
                    margin: 0,
                    textShadow: visualStyleName === 'Cyberpunk'
                        ? `0 0 30px ${accentColor}88`
                        : `0 0 30px ${primaryColor}44`
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
                    boxShadow: style.accentLineGlow ? `0 0 20px ${accentColor}` : `0 0 15px ${accentColor}`
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
    voiceDuration,
    visualStyle = 'Documentary'
}) => {
    const { fps } = useVideoConfig();

    // Get style config
    const styleConfig = getStyleConfig(visualStyle);

    // Calculate content timing
    const contentSeconds = durationInSeconds - introDuration - outroDuration;
    const segmentSeconds = contentSeconds / 3;

    // Generate subtitle entries
    const subtitleEntries: SubtitleEntry[] = React.useMemo(() => {
        if (!enableCaptions) return [];

        // PRIORITY 1: Use Whisper word-level timestamps (most accurate)
        if (subtitleTimestamps && subtitleTimestamps.length > 0) {
            console.log(`Using ${subtitleTimestamps.length} Whisper-timed subtitle chunks`);
            return subtitleTimestamps.map(chunk => ({
                text: chunk.text,
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
        <AbsoluteFill style={{ backgroundColor: styleConfig.backgroundColor }}>
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
                    style={styleConfig}
                    visualStyleName={visualStyle}
                />
            </Sequence>

            {/* --- SCENES --- */}
            {activeSegments.map((seg, i) => (
                <Sequence key={i} from={introFrames + segmentFrames * i} durationInFrames={segmentFrames}>
                    <Scene
                        sceneTitle={seg.title}
                        imageUrl={seg.imageUrl}
                        sceneIndex={i}
                        sceneDuration={segmentSeconds}
                        primaryColor={primaryColor}
                        accentColor={accentColor}
                        style={styleConfig}
                    />
                </Sequence>
            ))}

            {/* --- SEQUENCE 5: OUTRO --- */}
            <Sequence from={introFrames + segmentFrames * 3} durationInFrames={outroFrames}>
                <OutroScreen
                    cta={cta}
                    title={title}
                    primaryColor={primaryColor}
                    accentColor={accentColor}
                    style={styleConfig}
                    visualStyleName={visualStyle}
                />
            </Sequence>

            {/* --- OVERLAY: SUBTITLES --- */}
            {enableCaptions && (
                <Subtitles
                    subtitles={subtitleEntries}
                    primaryColor={primaryColor}
                    subtitleBg={styleConfig.subtitleBg}
                    subtitleBorder={styleConfig.subtitleBorder}
                    fontFamily={styleConfig.fontFamily}
                    isLight={visualStyle === 'Minimalist'}
                />
            )}
        </AbsoluteFill>
    );
};
