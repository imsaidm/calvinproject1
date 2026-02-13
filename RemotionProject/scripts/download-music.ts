#!/usr/bin/env ts-node
/**
 * Music Downloader — Download royalty-free music from Pixabay
 * 
 * Usage:
 *   npx ts-node scripts/download-music.ts --list        Show missing tracks
 *   npx ts-node scripts/download-music.ts --download-all Download all missing tracks
 *   npx ts-node scripts/download-music.ts --search "query"  Search Pixabay for tracks
 * 
 * Since Pixabay has no public music API, this script provides:
 * 1. A curated list of direct download URLs for recommended tracks
 * 2. Guidance on manually downloading from pixabay.com/music/
 */

import fs from 'fs';
import path from 'path';

const MUSIC_DIR = path.join(process.cwd(), 'assets', 'music');

// Curated Pixabay tracks — update URLs after downloading from pixabay.com/music/
// These are recommended searches to find matching tracks.
const CURATED_TRACKS: Record<string, { searchQuery: string; pixabayUrl: string; description: string }> = {
    // Calm / Ambient
    'ambient-piano.mp3': {
        searchQuery: 'ambient piano calm',
        pixabayUrl: 'https://pixabay.com/music/search/ambient%20piano/',
        description: 'Soft piano with ambient pads — for Documentary/Minimalist'
    },
    'nature-ambience.mp3': {
        searchQuery: 'nature ambient peaceful',
        pixabayUrl: 'https://pixabay.com/music/search/nature%20ambient/',
        description: 'Organic, nature-inspired ambient — for NatureDocs'
    },
    'calm-acoustic.mp3': {
        searchQuery: 'calm acoustic guitar',
        pixabayUrl: 'https://pixabay.com/music/search/calm%20acoustic/',
        description: 'Warm acoustic guitar, gentle — for Documentary/NatureDocs'
    },

    // Cinematic / Dramatic
    'cinematic-tension.mp3': {
        searchQuery: 'cinematic tension suspense',
        pixabayUrl: 'https://pixabay.com/music/search/cinematic%20tension/',
        description: 'Dark, suspenseful orchestral — for Cinematic/Horror'
    },
    'orchestral-rise.mp3': {
        searchQuery: 'orchestral epic triumphant',
        pixabayUrl: 'https://pixabay.com/music/search/orchestral%20epic/',
        description: 'Triumphant orchestral swell — for Cinematic'
    },
    'horror-drone.mp3': {
        searchQuery: 'horror dark drone ambient',
        pixabayUrl: 'https://pixabay.com/music/search/horror%20dark/',
        description: 'Eerie drones, unsettling atmosphere — for Horror'
    },

    // Electronic / Futuristic
    'synthwave.mp3': {
        searchQuery: 'synthwave retro 80s',
        pixabayUrl: 'https://pixabay.com/music/search/synthwave/',
        description: 'Retro synthwave, 80s vibes — for Cyberpunk/TechReview'
    },
    'tech-ambient.mp3': {
        searchQuery: 'technology ambient electronic',
        pixabayUrl: 'https://pixabay.com/music/search/technology%20ambient/',
        description: 'Clean tech-inspired ambient — for TechReview'
    },
    'electronic-chill.mp3': {
        searchQuery: 'electronic chill modern',
        pixabayUrl: 'https://pixabay.com/music/search/electronic%20chill/',
        description: 'Smooth electronic, modern feel — for TechReview/Cyberpunk'
    },

    // Minimal / Lofi
    'lofi-beats.mp3': {
        searchQuery: 'lofi hip hop beats',
        pixabayUrl: 'https://pixabay.com/music/search/lofi/',
        description: 'Chill lofi hip hop beats — for Minimalist'
    },
    'soft-corporate.mp3': {
        searchQuery: 'corporate soft background',
        pixabayUrl: 'https://pixabay.com/music/search/corporate%20soft/',
        description: 'Light corporate/presentation music — for Minimalist/TechReview'
    },

    // Upbeat / Fun
    'happy-ukulele.mp3': {
        searchQuery: 'happy ukulele cheerful',
        pixabayUrl: 'https://pixabay.com/music/search/happy%20ukulele/',
        description: 'Cheerful ukulele, sunny vibes — for ExplainLikeIm5'
    },
    'quirky-fun.mp3': {
        searchQuery: 'quirky fun cartoon',
        pixabayUrl: 'https://pixabay.com/music/search/quirky%20fun/',
        description: 'Playful, cartoon-like music — for ExplainLikeIm5'
    },
    'kids-adventure.mp3': {
        searchQuery: 'kids adventure playful',
        pixabayUrl: 'https://pixabay.com/music/search/kids%20adventure/',
        description: 'Whimsical adventure music — for ExplainLikeIm5'
    },

    // Inspirational
    'motivational.mp3': {
        searchQuery: 'motivational inspiring bold',
        pixabayUrl: 'https://pixabay.com/music/search/motivational/',
        description: 'Bold, determined motivational — for Documentary/Cinematic'
    },
    'uplifting-indie.mp3': {
        searchQuery: 'uplifting indie hopeful',
        pixabayUrl: 'https://pixabay.com/music/search/uplifting%20indie/',
        description: 'Fresh indie, hopeful vibes — for NatureDocs/Documentary'
    }
};

function listMissingTracks() {
    console.log('\n🎵 Music Library Status\n');
    console.log('━'.repeat(70));

    let existCount = 0;
    let missingCount = 0;

    // Check existing original tracks
    const allFiles = new Set<string>();
    const existingFiles = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR) : [];

    for (const file of existingFiles) {
        allFiles.add(file);
    }

    // Check all curated tracks
    for (const [filename, info] of Object.entries(CURATED_TRACKS)) {
        const exists = allFiles.has(filename);
        const icon = exists ? '✅' : '❌';

        if (exists) existCount++;
        else missingCount++;

        console.log(`${icon} ${filename.padEnd(25)} ${info.description}`);
        if (!exists) {
            console.log(`   🔗 Search: ${info.pixabayUrl}`);
        }
    }

    // Also show existing tracks not in curated list
    const originalTracks = ['documentary.mp3', 'cinematic.mp3', 'cyberpunk.mp3', 'minimalist.mp3', 'animated.mp3', 'inspirational.mp3'];
    console.log('\n── Original Tracks ──');
    for (const file of originalTracks) {
        const exists = allFiles.has(file);
        console.log(`${exists ? '✅' : '❌'} ${file}`);
        if (exists) existCount++;
    }

    console.log('\n━'.repeat(70));
    console.log(`📊 Total: ${existCount} available, ${missingCount} missing`);
    console.log(`\n💡 To download missing tracks:`);
    console.log(`   1. Open the Pixabay URL for each missing track`);
    console.log(`   2. Search and find a track you like`);
    console.log(`   3. Download the MP3 and save it to: ${MUSIC_DIR}`);
    console.log(`   4. Rename the file to match the expected filename\n`);
}

function showSearchHelp(query: string) {
    const encoded = encodeURIComponent(query);
    console.log(`\n🔍 Pixabay Music Search: "${query}"`);
    console.log(`━`.repeat(50));
    console.log(`🔗 Open in browser: https://pixabay.com/music/search/${encoded}/`);
    console.log(`\n💡 After finding a track you like:`);
    console.log(`   1. Click the download button on Pixabay`);
    console.log(`   2. Save the MP3 to: ${MUSIC_DIR}/`);
    console.log(`   3. Rename to match your desired filename\n`);
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.includes('--list') || args.includes('-l')) {
    listMissingTracks();
} else if (args.includes('--search') || args.includes('-s')) {
    const searchIdx = args.indexOf('--search') !== -1 ? args.indexOf('--search') : args.indexOf('-s');
    const query = args[searchIdx + 1];
    if (!query) {
        console.error('❌ Please provide a search query: --search "ambient piano"');
        process.exit(1);
    }
    showSearchHelp(query);
} else {
    console.log(`
🎵 Music Downloader — Pixabay Royalty-Free Music

Commands:
  --list, -l           Show all tracks and their download status
  --search, -s "query" Get Pixabay search URL for a music query

Examples:
  npx ts-node scripts/download-music.ts --list
  npx ts-node scripts/download-music.ts --search "ambient piano calm"
`);
}
