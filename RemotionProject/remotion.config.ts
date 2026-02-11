import { Config } from '@remotion/cli/config';
import path from 'path';

// Add local ffmpeg to PATH
const binPath = process.cwd();
process.env.PATH = `${binPath}${path.delimiter}${process.env.PATH}`;

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// Set Chromium path for Docker/Linux environments
if (process.env.REMOTION_CHROME_EXECUTABLE) {
    Config.setBrowserExecutable(process.env.REMOTION_CHROME_EXECUTABLE);
} else if (process.env.CHROMIUM_PATH) {
    Config.setBrowserExecutable(process.env.CHROMIUM_PATH);
}
