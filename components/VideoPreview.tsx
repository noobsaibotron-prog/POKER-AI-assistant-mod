
import React, { useState, MouseEvent } from 'react';

interface VideoPreviewProps {
    videoRef: React.RefObject<HTMLVideoElement>;
    isStreaming: boolean;
    onVideoClick?: (x: number, y: number) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ videoRef, isStreaming, onVideoClick }) => {
    const [clickEffect, setClickEffect] = useState<{x: number, y: number, type: string} | null>(null);

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        if (!isStreaming || !onVideoClick || !videoRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        onVideoClick(x, y);

        // Visual feedback
        const type = y > 0.65 ? 'HERO' : (y > 0.25 && y <= 0.65 ? 'BOARD' : 'SCAN');
        setClickEffect({ x: e.clientX - rect.left, y: e.clientY - rect.top, type });
        
        setTimeout(() => setClickEffect(null), 800);
    };

    return (
        <div className="relative w-full h-full" onClick={handleClick}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted 
                className={`w-full h-full object-contain rounded-xl transition-opacity duration-500 ${isStreaming ? 'opacity-100 cursor-crosshair' : 'opacity-0 absolute'}`}
            />
            
            {/* Click Feedback Effect */}
            {clickEffect && (
                <div 
                    className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                    style={{ left: clickEffect.x, top: clickEffect.y }}
                >
                    <div className="w-12 h-12 border-2 border-emerald-400 rounded-full animate-ping opacity-75"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                    <span className="mt-6 text-[10px] font-black text-emerald-400 bg-black/50 px-2 py-0.5 rounded shadow-lg animate-bounce">
                        ANALISI {clickEffect.type}
                    </span>
                </div>
            )}
        </div>
    );
};
