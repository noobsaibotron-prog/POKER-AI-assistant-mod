import React, { useEffect, useRef } from 'react';
import { Transcript } from '../types.ts';

interface ActivityLogProps {
    transcripts: Transcript[];
}

export const ActivityLog: React.FC<ActivityLogProps> = ({ transcripts }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcripts]);

    if (transcripts.length === 0) {
        return (
            <div className="text-slate-500 text-sm text-center italic mt-10">
                L'analisi in tempo reale apparirà qui...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {transcripts.map((t) => (
                <div key={t.id} className={`flex flex-col ${t.source === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`text-xs mb-1 ${t.source === 'user' ? 'text-slate-400' : 'text-emerald-400 font-bold'}`}>
                        {t.source === 'user' ? 'Tu' : 'PokerPro AI'}
                    </div>
                    <div 
                        className={`p-3 rounded-xl max-w-[90%] text-sm leading-relaxed ${
                            t.source === 'user' 
                            ? 'bg-slate-700 text-slate-200 rounded-tr-none' 
                            : 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-100 rounded-tl-none'
                        }`}
                    >
                        {t.text}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">
                        {t.timestamp.toLocaleTimeString()}
                    </div>
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
};