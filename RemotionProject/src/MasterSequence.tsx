import React from 'react';
import { Series } from 'remotion';
import { MyComposition } from './Composition';

export const MasterSequence: React.FC = () => {
    return (
        <Series>
            <Series.Sequence durationInFrames={30 * 10}>
                <MyComposition
                    title="Segment 1: Introduction"
                    script="Welcome to the future of AI video generation."
                    durationInSeconds={10}
                    primaryColor="#ff0055"
                    accentColor="#22c55e"
                    cta="Wait for it..."
                    enableCaptions={true}
                    introDuration={1}
                    outroDuration={1}
                    visualStyle="Documentary"
                />
            </Series.Sequence>
            <Series.Sequence durationInFrames={30 * 10}>
                <MyComposition
                    title="Segment 2: The Logic"
                    script="We use complex algorithms to stitch scenes together seamlessly."
                    durationInSeconds={10}
                    primaryColor="#00ccff"
                    accentColor="#ffcc00"
                    cta="Almost there..."
                    enableCaptions={true}
                    introDuration={1}
                    outroDuration={1}
                    visualStyle="Cyberpunk"
                />
            </Series.Sequence>
            <Series.Sequence durationInFrames={30 * 10}>
                <MyComposition
                    title="Segment 3: Conclusion"
                    script="This demonstrates our ability to chain multiple videos into one."
                    durationInSeconds={10}
                    primaryColor="#9900ff"
                    accentColor="#00ff99"
                    cta="Thanks for watching!"
                    enableCaptions={true}
                    introDuration={1}
                    outroDuration={1}
                    visualStyle="Cinematic"
                />
            </Series.Sequence>
        </Series>
    );
};
