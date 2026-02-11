import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'assets', 'branding.config.json');
const logoPath = path.join(process.cwd(), 'assets', 'logo.png');

const args = process.argv.slice(2);

const getArg = (flag: string) => {
    const index = args.indexOf(flag);
    if (index === -1) {
        return undefined;
    }
    return args[index + 1];
};

const parseNumber = (value: string | undefined, fallback: number) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFeatures = (value: string | undefined, fallback: string[]) => {
    if (!value) {
        return fallback;
    }
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const loadExisting = () => {
    if (!fs.existsSync(configPath)) {
        return {};
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
};

const existing = loadExisting();

const newConfig = {
    title: getArg('--title') ?? existing.title ?? 'Updated Brand AI',
    tagline: getArg('--tagline') ?? existing.tagline ?? 'AI powered video automation',
    primaryColor: getArg('--primary') ?? existing.primaryColor ?? '#ff0055',
    accentColor: getArg('--accent') ?? existing.accentColor ?? '#22c55e',
    features: parseFeatures(getArg('--features'), existing.features ?? [
        'Auto-generate product demos',
        'Centralized branding assets',
        'Voiceovers with WaveSpeed + ffmpeg'
    ]),
    cta: getArg('--cta') ?? existing.cta ?? 'Create your next video in minutes',
    durationSeconds: parseNumber(getArg('--duration'), existing.durationSeconds ?? 30)
};

const newLogo = getArg('--logo');
if (newLogo) {
    const resolved = path.resolve(newLogo);
    fs.copyFileSync(resolved, logoPath);
    console.log(`Logo updated: ${resolved} -> ${logoPath}`);
}

console.log('Updating branding config...');
fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));
console.log('Branding updated to:', newConfig);
console.log('Tip: Use --features "Feature one,Feature two" to update the list.');
