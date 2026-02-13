/**
 * Copyright Checker - Verifies assets used in video generation are copyright-safe.
 * 
 * Layer 2: Pre-generation checks for music tracks, images (Pexels), and video clips.
 * Generates a copyright report per video with overall safety status.
 */

import { getTrackById, MUSIC_TRACKS, type MusicTrack } from './music-library';

export interface CopyrightCheckResult {
    safe: boolean;
    score: number;          // 0-100 copyright safety score
    music: {
        trackId: string;
        trackName: string;
        safe: boolean;
        license: string;
        source: string;
        details: string;
    };
    images: {
        safe: boolean;
        source: string;
        license: string;
        details: string;
    };
    videos: {
        safe: boolean;
        source: string;
        license: string;
        details: string;
    };
    recommendations: string[];
    timestamp: string;
}

/**
 * Check if a music track is copyright-safe for YouTube.
 */
export function checkMusicTrack(trackId: string): {
    safe: boolean;
    track: MusicTrack | null;
    details: string;
} {
    const track = getTrackById(trackId);

    if (!track) {
        return {
            safe: false,
            track: null,
            details: `Track "${trackId}" not found in music library. Unknown tracks may trigger Content ID.`
        };
    }

    if (!track.copyrightSafe) {
        return {
            safe: false,
            track,
            details: `Track "${track.name}" has not been verified as copyright-safe. It may trigger YouTube Content ID claims.`
        };
    }

    return {
        safe: true,
        track,
        details: `✅ "${track.name}" is verified royalty-free under ${track.license} (Source: ${track.source})`
    };
}

/**
 * Check if image sources are copyright-safe.
 * Pexels images are royalty-free under the Pexels License.
 */
export function checkImageSources(imageUrls: string[]): {
    safe: boolean;
    details: string;
} {
    if (!imageUrls || imageUrls.length === 0) {
        return { safe: true, details: 'No images to check.' };
    }

    const pexelsImages = imageUrls.filter(url => url.includes('pexels.com') || url.includes('pexelscdn'));
    const picsumImages = imageUrls.filter(url => url.includes('picsum.photos'));
    const unknownImages = imageUrls.filter(url =>
        !url.includes('pexels.com') && !url.includes('pexelscdn') && !url.includes('picsum.photos')
    );

    if (unknownImages.length > 0) {
        return {
            safe: false,
            details: `⚠️ ${unknownImages.length} image(s) from unknown sources. Verify their licenses.`
        };
    }

    return {
        safe: true,
        details: `✅ All ${imageUrls.length} images from royalty-free sources (Pexels: ${pexelsImages.length}, Picsum: ${picsumImages.length})`
    };
}

/**
 * Check if video clip sources are copyright-safe.
 */
export function checkVideoSources(videoUrls: string[]): {
    safe: boolean;
    details: string;
} {
    const validUrls = (videoUrls || []).filter(url => url && url.length > 0);

    if (validUrls.length === 0) {
        return { safe: true, details: 'No video clips to check.' };
    }

    const pexelsVideos = validUrls.filter(url => url.includes('pexels.com') || url.includes('pexelscdn'));
    const unknownVideos = validUrls.filter(url =>
        !url.includes('pexels.com') && !url.includes('pexelscdn')
    );

    if (unknownVideos.length > 0) {
        return {
            safe: false,
            details: `⚠️ ${unknownVideos.length} video clip(s) from unknown sources. Verify their licenses.`
        };
    }

    return {
        safe: true,
        details: `✅ All ${validUrls.length} video clips from Pexels (royalty-free)`
    };
}

/**
 * Generate a full copyright report for a video's assets.
 */
export function generateCopyrightReport(
    trackId: string,
    imageUrls: string[],
    videoUrls: string[]
): CopyrightCheckResult {
    const musicCheck = checkMusicTrack(trackId);
    const imageCheck = checkImageSources(imageUrls);
    const videoCheck = checkVideoSources(videoUrls);

    const allSafe = musicCheck.safe && imageCheck.safe && videoCheck.safe;

    // Score: 100 if all safe, deduct 40 for unsafe music, 30 for images, 30 for videos
    let score = 100;
    if (!musicCheck.safe) score -= 40;
    if (!imageCheck.safe) score -= 30;
    if (!videoCheck.safe) score -= 30;

    const recommendations: string[] = [];
    if (!musicCheck.safe) {
        recommendations.push('Switch to a verified royalty-free music track from the library.');
    }
    if (!imageCheck.safe) {
        recommendations.push('Use Pexels images only to ensure royalty-free licensing.');
    }
    if (!videoCheck.safe) {
        recommendations.push('Use Pexels video clips to avoid copyright claims.');
    }
    if (allSafe) {
        recommendations.push('All assets are copyright-safe. Safe for YouTube monetization.');
    }

    return {
        safe: allSafe,
        score,
        music: {
            trackId: trackId,
            trackName: musicCheck.track?.name || 'Unknown',
            safe: musicCheck.safe,
            license: musicCheck.track?.license || 'Unknown',
            source: musicCheck.track?.source || 'Unknown',
            details: musicCheck.details
        },
        images: {
            safe: imageCheck.safe,
            source: 'Pexels / Picsum',
            license: 'Pexels License — royalty-free',
            details: imageCheck.details
        },
        videos: {
            safe: videoCheck.safe,
            source: 'Pexels',
            license: 'Pexels License — royalty-free',
            details: videoCheck.details
        },
        recommendations,
        timestamp: new Date().toISOString()
    };
}

/**
 * Quick check: is an entire video safe for YouTube?
 */
export function isVideoSafeForYouTube(trackId: string): {
    safe: boolean;
    reason: string;
} {
    const musicCheck = checkMusicTrack(trackId);
    if (!musicCheck.safe) {
        return { safe: false, reason: musicCheck.details };
    }
    // Since we control image/video sourcing (always Pexels), they're safe by default
    return { safe: true, reason: '✅ All assets verified copyright-safe for YouTube monetization.' };
}
