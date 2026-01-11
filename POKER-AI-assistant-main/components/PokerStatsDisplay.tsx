
import React, { useState, useEffect } from 'react';
import { PokerStatsDisplayProps } from '../types';

const Card: React.FC<{ card: string; faded?: boolean }> = ({ card, faded }) => {
    const suitChar = card.slice(-1).toLowerCase();
    const value = card.slice(0, -1);
    
    let suitIcon = '';
    let colorClass = '';

    switch (suitChar) {
        case 'h': suitIcon = '♥'; colorClass = 'text-red-600'; break;
        case 'd': suitIcon = '♦'; colorClass = 'text-red-600'; break;
        case 'c': suitIcon = '♣'; colorClass = 'text-slate-900'; break;
        case 's': suitIcon = '♠'; colorClass = 'text-slate-900'; break;
        default: suitIcon = '?'; colorClass = 'text-slate-500';
    }

    return (
        <div className={`bg-white rounded-md w-8 h-11 flex flex-col items-center justify-center border border-slate-300 shadow-sm shrink-0 transition-all duration-300 ${faded ? 'opacity-40 grayscale-[0.5]' : 'scale-100'}`}>
            <span className={`font-bold text-xs leading-none ${colorClass}`}>{value}</span>
            <span className={`text-[10px] leading-none ${colorClass}`}>{suitIcon}</span>
        </div>
    );
};

export const PokerStatsDisplay: React.FC<PokerStatsDisplayProps> = ({ state, isStreaming, onManualScan, onDeepAnalysis, isDeepAnalyzing }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

    useEffect(() => {
        if (state) {
            setLastUpdate(Date.now());
            setIsScanning(false);
        }
    }, [state]);

    if (!isStreaming) return null;
    
    const displayState = state || {
        winProbability: 0,
        equity: 0,
        potOdds: 'N/A',
        suggestedAction: 'WAITING' as const,
        reasoning: "In attesa di analisi...",
        handStrength: "-",
        holeCards: [],
        communityCards: [],
        opponentEstimatedCards: [],
        opponentRange: "Calcolo range..."
    };

    const handleScan = () => {
        setIsScanning(true);
        onManualScan();
        // Fallback reset if no response comes quickly
        setTimeout(() => setIsScanning(false), 2000);
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'FOLD': return 'bg-red-600 text-white border-red-400 shadow-red-900/40';
            case 'CHECK': return 'bg-slate-700 text-slate-200 border-slate-500 shadow-slate-900/40';
            case 'CALL': return 'bg-blue-600 text-white border-blue-400 shadow-blue-900/40';
            case 'RAISE':
            case 'ALL-IN': return 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/40';
            default: return 'bg-slate-800 text-slate-500 border-slate-700';
        }
    };

    const getWinProbColor = (prob: number) => {
        if (prob < 30) return 'text-red-400';
        if (prob < 60) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    return (
        <div className={`absolute top-4 right-4 w-80 bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-700 p-5 shadow-2xl z-20 transition-all duration-300 max-h-[90vh] overflow-y-auto ${isScanning ? 'ring-2 ring-emerald-500/50 scale-[1.01]' : 'ring-0 scale-100'}`}>
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                <div className="flex flex-col">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${isScanning ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></span>
                        GTO HUD
                    </h3>
                    <span className="text-[8px] text-slate-600 font-mono mt-0.5 uppercase tracking-tighter">
                        SYNC: {new Date(lastUpdate).toLocaleTimeString()}
                    </span>
                </div>
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleScan}
                        disabled={isScanning || isDeepAnalyzing}
                        className={`group relative flex items-center justify-center gap-1.5 px-3 py-2 font-black rounded-lg transition-all shadow-lg active:scale-95 text-[10px] overflow-hidden ${
                            isScanning ? 'bg-slate-700 text-slate-500 cursor-wait' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                    >
                        <svg className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {isScanning ? 'SCAN...' : 'SCAN'}
                    </button>
                    <button 
                        onClick={onDeepAnalysis}
                        disabled={isDeepAnalyzing}
                        className={`group flex items-center justify-center gap-1.5 px-3 py-1.5 font-black rounded-lg transition-all shadow-lg text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 ${isDeepAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        DEEP ANALYSIS
                    </button>
                </div>
            </div>

            {/* Deep Analysis Result */}
            {displayState.deepAnalysis && (
                <div className="mb-4 bg-indigo-900/30 border border-indigo-500/30 p-3 rounded-lg animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="text-[10px] text-indigo-400 font-black uppercase mb-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                        PRO STRATEGY REPORT
                    </div>
                    <div className="text-[11px] text-indigo-100 leading-normal italic line-clamp-6 hover:line-clamp-none transition-all cursor-pointer">
                        {displayState.deepAnalysis}
                    </div>
                </div>
            )}

            {/* Suggested Action - Highlighted at top for quick reaction */}
            <div className={`mb-4 p-4 rounded-xl border-b-4 text-center shadow-xl transform transition-all duration-300 hover:scale-[1.02] ${getActionColor(displayState.suggestedAction)}`}>
                <div className="text-[10px] uppercase font-black opacity-80 mb-1 tracking-wider">Consiglio GTO</div>
                <div className="text-4xl font-black tracking-tighter italic uppercase drop-shadow-md">{displayState.suggestedAction}</div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-center relative overflow-hidden group">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Win Prob</div>
                    <div className={`text-2xl font-black ${getWinProbColor(displayState.winProbability)} tracking-tight`}>
                        {displayState.winProbability}%
                    </div>
                </div>
                <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 text-center relative overflow-hidden group">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Equity</div>
                    <div className="text-2xl font-black text-blue-400 tracking-tight">
                        {displayState.equity || displayState.winProbability}%
                    </div>
                </div>
            </div>

            {/* Hand & Board */}
            <div className="flex gap-2 mb-4 justify-between">
                <div className="bg-slate-800/40 rounded-lg p-2.5 flex-1 flex flex-col items-center border border-slate-700/50">
                    <span className="text-[9px] text-slate-500 mb-1.5 uppercase font-black">Tu (Hero)</span>
                    <div className="flex gap-1.5">
                        {displayState.holeCards.length > 0 ? (
                            displayState.holeCards.map((card, idx) => <Card key={`hole-${idx}`} card={card} />)
                        ) : (
                            <div className="flex gap-1.5 opacity-20"><div className="w-8 h-11 bg-slate-600 rounded-md"/><div className="w-8 h-11 bg-slate-600 rounded-md"/></div>
                        )}
                    </div>
                </div>

                <div className="bg-slate-800/40 rounded-lg p-2.5 flex-[1.5] flex flex-col items-center border border-slate-700/50">
                    <span className="text-[9px] text-slate-500 mb-1.5 uppercase font-black">Board</span>
                    <div className="flex gap-1 flex-wrap justify-center">
                        {displayState.communityCards.length > 0 ? (
                            displayState.communityCards.map((card, idx) => <Card key={`comm-${idx}`} card={card} />)
                        ) : (
                            <div className="h-11 flex items-center text-[10px] text-slate-600 italic font-medium">In attesa...</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reasoning & Hand Strength - IMPROVED CLARITY */}
            <div className="space-y-3.5 mb-2">
                <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                    <div className="text-[9px] text-slate-500 uppercase font-black mb-1.5">Punto Attuale</div>
                    <div className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <div className="w-1.5 h-3 bg-emerald-500 rounded-full"></div>
                        {displayState.handStrength}
                    </div>
                </div>
                <div className="p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                    <div className="text-[9px] text-emerald-400 mb-1.5 uppercase font-black tracking-wider">Analisi Strategica</div>
                    <div className="text-sm text-slate-200 leading-snug font-medium border-l-2 border-emerald-500 pl-3 py-0.5">
                        {displayState.reasoning}
                    </div>
                </div>
            </div>

            {/* Pot Odds & Range - Moved to bottom as secondary info */}
            <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Pot Odds: <span className="text-white ml-1">{displayState.potOdds || '-'}</span></span>
                </div>
                <div className="flex flex-col">
                    <div className="text-[9px] text-slate-500 uppercase mb-0.5 font-bold">Range Stimato Opponent</div>
                    <div className="text-[10px] font-bold text-slate-400 truncate leading-tight">
                        {displayState.opponentRange || "..."}
                    </div>
                </div>
            </div>
        </div>
    );
};
