
import React, { useEffect, useRef } from 'react';
import { Transcript } from '../types.ts';

interface TranscriptionLogProps {
    transcripts: Transcript[];
}

export const TranscriptionLog: React.FC<TranscriptionLogProps> = ({ transcripts }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    if (transcripts.length === 0) return null;

    return (
        <div className="absolute bottom-4 left-4 w-72 max-h-48 overflow-y-auto bg-black/40 backdrop-blur-md rounded-xl border border-white/10 p-3 z-30 mask-linear-fade">
            <div className="space-y-2">
                {transcripts.map((t, idx) => (
                    <div key={idx} className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase mb-0.5">PokerPro AI</span>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed shadow-black drop-shadow-md">
                            {t.text}
                        </p>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <style>{`
                .mask-linear-fade {
                    mask-image: linear-gradient(to bottom, transparent, black 15%);
                }
            `}</style>
        </div>
    );
};
