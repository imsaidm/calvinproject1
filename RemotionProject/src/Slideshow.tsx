import React from 'react';
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * CinematicBackground - Single image with slow Ken Burns effect.
 * Used as fallback when only 1 image is available.
 */
export const CinematicBackground: React.FC<{
    imageUrl: string;
    durationInSeconds: number;
    direction?: 'up' | 'down' | 'left' | 'right';
}> = ({ imageUrl, durationInSeconds, direction = 'up' }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const totalFrames = durationInSeconds * fps;
    const progress = Math.min(frame / totalFrames, 1);

    // Slow Ken Burns: scale 1.0 → 1.12 over the full segment
    const scale = interpolate(progress, [0, 1], [1.0, 1.12]);

    // Slow pan based on direction
    const translateY = direction === 'up'
        ? interpolate(progress, [0, 1], [0, -15])
        : direction === 'down'
            ? interpolate(progress, [0, 1], [0, 15])
            : 0;
    const translateX = direction === 'left'
        ? interpolate(progress, [0, 1], [0, -15])
        : direction === 'right'
            ? interpolate(progress, [0, 1], [0, 15])
            : 0;

    return (
        <AbsoluteFill>
            <Img
                src={imageUrl}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                }}
            />
        </AbsoluteFill>
    );
};

/**
 * MultiVisualBackground - Cycles through multiple images + an optional video clip
 * with smooth crossfade transitions. Each visual shows for ~4-6 seconds.
 * Creates dynamic, engaging b-roll that keeps viewers watching.
 */
export const MultiVisualBackground: React.FC<{
    imageUrls: string[];
    videoUrl?: string;
    durationInSeconds: number;
}> = ({ imageUrls, videoUrl, durationInSeconds }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const totalFrames = durationInSeconds * fps;

    // Build visual list: images + video interleaved
    // Pattern: image, image, video (if available), image
    const visuals: Array<{ type: 'image' | 'video'; url: string }> = [];

    if (imageUrls.length > 0) visuals.push({ type: 'image', url: imageUrls[0] });
    if (videoUrl) visuals.push({ type: 'video', url: videoUrl });
    if (imageUrls.length > 1) visuals.push({ type: 'image', url: imageUrls[1] });
    if (imageUrls.length > 2) visuals.push({ type: 'image', url: imageUrls[2] });

    if (visuals.length === 0) return null;
    if (visuals.length === 1) {
        // Single visual — just Ken Burns
        return (
            <CinematicBackground
                imageUrl={visuals[0].url}
                durationInSeconds={durationInSeconds}
                direction="up"
            />
        );
    }

    // Calculate timing: equal time per visual with crossfade overlap
    const framesPerVisual = totalFrames / visuals.length;
    const crossfadeFrames = Math.min(fps * 0.8, framesPerVisual * 0.2); // 0.8s crossfade

    // Ken Burns directions for variety
    const directions = ['up', 'right', 'down', 'left'] as const;

    return (
        <AbsoluteFill>
            {visuals.map((visual, i) => {
                const segStart = i * framesPerVisual;
                const segEnd = segStart + framesPerVisual;

                // Opacity: fade in at start, fade out at end (crossfade with next)
                let opacity = 1;
                if (i > 0) {
                    // Fade in
                    opacity = interpolate(
                        frame,
                        [segStart - crossfadeFrames, segStart + crossfadeFrames * 0.5],
                        [0, 1],
                        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    );
                }
                if (i < visuals.length - 1) {
                    // Fade out at end
                    const fadeOutOpacity = interpolate(
                        frame,
                        [segEnd - crossfadeFrames, segEnd],
                        [1, 0],
                        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                    );
                    opacity = Math.min(opacity, fadeOutOpacity);
                } else {
                    // Last visual: stay visible
                    if (frame < segStart - crossfadeFrames) opacity = 0;
                }

                // Don't render if not visible
                if (frame < segStart - crossfadeFrames * 2 || (i < visuals.length - 1 && frame > segEnd + crossfadeFrames)) {
                    return null;
                }

                // Ken Burns for this visual
                const localProgress = Math.max(0, Math.min(1, (frame - segStart) / framesPerVisual));
                const scale = interpolate(localProgress, [0, 1], [1.0, 1.12]);
                const dir = directions[i % directions.length];
                const translateY = dir === 'up' ? localProgress * -12
                    : dir === 'down' ? localProgress * 12 : 0;
                const translateX = dir === 'left' ? localProgress * -12
                    : dir === 'right' ? localProgress * 12 : 0;

                if (visual.type === 'video') {
                    return (
                        <AbsoluteFill key={`v-${i}`} style={{ opacity }}>
                            <OffthreadVideo
                                src={visual.url}
                                muted
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                }}
                            />
                        </AbsoluteFill>
                    );
                }

                return (
                    <AbsoluteFill key={`v-${i}`} style={{ opacity }}>
                        <Img
                            src={visual.url}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                            }}
                        />
                    </AbsoluteFill>
                );
            })}
        </AbsoluteFill>
    );
};

/**
 * Slideshow - Legacy component for backward compatibility.
 * Cycles through multiple images with crossfade transitions.
 */
export const Slideshow: React.FC<{
    images: string[];
    durationInSeconds: number;
}> = ({ images, durationInSeconds }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const totalFrames = durationInSeconds * fps;
    const timePerImage = totalFrames / images.length;

    const currentImageIndex = Math.floor(frame / timePerImage) % images.length;
    const nextImageIndex = (currentImageIndex + 1) % images.length;
    const progress = (frame % timePerImage) / timePerImage;

    const scale = interpolate(progress, [0, 1], [1.1, 1.2]);
    const translate = interpolate(progress, [0, 1], [0, -20]);

    const fadeStart = 0.8;
    const isFading = progress > fadeStart;
    const opacity = isFading ? interpolate(progress, [fadeStart, 1], [1, 0]) : 1;
    const nextOpacity = isFading ? interpolate(progress, [fadeStart, 1], [0, 1]) : 0;

    return (
        <AbsoluteFill>
            <AbsoluteFill style={{ opacity }}>
                <Img
                    src={images[currentImageIndex]}
                    style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        transform: `scale(${scale}) translateY(${translate}px)`
                    }}
                />
            </AbsoluteFill>
            {isFading && (
                <AbsoluteFill style={{ opacity: nextOpacity }}>
                    <Img
                        src={images[nextImageIndex]}
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            transform: `scale(1.1)`
                        }}
                    />
                </AbsoluteFill>
            )}
        </AbsoluteFill>
    );
};
