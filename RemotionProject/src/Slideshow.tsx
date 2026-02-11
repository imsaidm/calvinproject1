import React from 'react';
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * CinematicBackground - Single image with slow Ken Burns effect.
 * Used as the background for each video segment.
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
 * Slideshow - Legacy component for backward compatibility (used by MasterSequence).
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
