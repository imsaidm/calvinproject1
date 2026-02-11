import { Composition } from 'remotion';
import { MyComposition, VideoSchema } from './Composition';
import { MasterSequence } from './MasterSequence';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="AiVideo"
                component={MyComposition}
                durationInFrames={30 * 30} // Default 30s, overridden by calculateMetadata
                fps={30}
                width={1920}
                height={1080}
                schema={VideoSchema}
                defaultProps={{
                    title: "AI VIDEO GENERATOR",
                    script: "Waiting for AI content...",
                    durationInSeconds: 30,
                    voiceDuration: 24, // Example duration for preview
                    primaryColor: "#ff0055",
                    accentColor: "#22c55e",
                    cta: "Watch Now",
                    enableCaptions: true,
                    introDuration: 3,
                    outroDuration: 3
                }}
                calculateMetadata={({ props }) => {
                    return {
                        durationInFrames: (props.durationInSeconds || 30) * 30,
                        props,
                    };
                }}
            />
            <Composition
                id="MasterSequence"
                component={MasterSequence}
                durationInFrames={900}
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};
