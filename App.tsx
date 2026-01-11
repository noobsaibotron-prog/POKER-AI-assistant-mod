import React, { useRef } from 'react';
import { useLiveGemini } from './hooks/useLiveGemini.ts';
import { ControlBar } from './components/ControlBar.tsx';
import { AudioVisualizer } from './components/AudioVisualizer.tsx';
import { VideoPreview } from './components/VideoPreview.tsx';
import { PokerStatsDisplay } from './components/PokerStatsDisplay.tsx';
import { TranscriptionLog } from './components/TranscriptionLog.tsx';
import { PokerCardIcon, ChipIcon } from './components/Icons.tsx';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    connect,
    disconnect,
    isActive,
    isStreamingScreen,
    startScreenShare,
    stopScreenShare,
    volume, 
    setVolume,
    pokerState,
    error,
    isPermissionError,
    resetError,
    triggerManualScan,
    runDeepAnalysis,
    isDeepAnalyzing,
    analyzeRegion,
    transcripts
  } = useLiveGemini({ videoRef, canvasRef });

  const handleOpenKeySelector = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      await window.aistudio.openSelectKey();
      resetError();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-white selection:bg-emerald-500 selection:text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700 shadow-lg z-10">
        <div className="flex items-center space-x-3">
          <div className="bg-emerald-600 p-2 rounded-lg shadow-inner shadow-emerald-400/20">
            <PokerCardIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-emerald-400">PokerPro AI</h1>
            <p className="text-xs text-slate-400 font-medium">Professional GTO Assistant</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-2 border ${isActive ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-slate-700 border-slate-600 text-slate-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></span>
            <span>{isActive ? 'LIVE CONNECTED' : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 bg-black/50 relative flex flex-col items-center justify-center p-4">
          <div className="relative w-full h-full max-w-5xl flex items-center justify-center bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden group">
            
            <VideoPreview 
                videoRef={videoRef} 
                isStreaming={isStreamingScreen} 
                onVideoClick={analyzeRegion}
            />
            
            <PokerStatsDisplay 
              state={pokerState} 
              isStreaming={isStreamingScreen && isActive} 
              onManualScan={triggerManualScan} 
              onDeepAnalysis={runDeepAnalysis}
              isDeepAnalyzing={isDeepAnalyzing}
            />

            <TranscriptionLog transcripts={transcripts} />

            <canvas ref={canvasRef} className="hidden" />

            {!isStreamingScreen && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/90 z-10 pointer-events-none">
                <div className="bg-slate-800 p-6 rounded-full mb-4 group-hover:scale-105 transition-transform duration-300 ring-1 ring-slate-700">
                  <ChipIcon className="w-16 h-16 opacity-50" />
                </div>
                <p className="text-lg font-medium">In attesa della condivisione schermo...</p>
                <p className="text-sm opacity-60 mt-2 max-w-md text-center px-6">
                  Avvia la condivisione dello schermo per l'analisi GTO in tempo reale.
                </p>
              </div>
            )}
            
            {isActive && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-64 h-16 pointer-events-none">
                <AudioVisualizer isActive={isActive} />
              </div>
            )}

            {isDeepAnalyzing && (
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-black text-emerald-400 tracking-widest animate-pulse">DEEP GTO ANALYSIS IN PROGRESS...</h3>
                <p className="text-slate-400 text-sm mt-2">Gemini 3 Pro is processing the visual sequence</p>
              </div>
            )}

            {isPermissionError && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center z-50 p-8 text-center backdrop-blur-md">
                <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl max-w-md">
                  <h2 className="text-2xl font-bold text-red-400 mb-2">Accesso Negato</h2>
                  <p className="text-slate-300 mb-6 text-sm">
                    L'API Key corrente non ha i permessi necessari. Seleziona una chiave API valida.
                  </p>
                  <button 
                    onClick={handleOpenKeySelector}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg mb-4"
                  >
                    Seleziona API Key
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {error && !isPermissionError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-xl backdrop-blur-sm border border-red-400 animate-bounce z-50">
          <span className="font-bold mr-2">Errore:</span> {error}
          <button onClick={resetError} className="ml-4 text-white/70 hover:text-white underline text-sm">Dismiss</button>
        </div>
      )}

      {/* Footer Controls */}
      <footer className="bg-slate-800 border-t border-slate-700 p-4 z-20">
        <ControlBar 
          isActive={isActive}
          isStreamingScreen={isStreamingScreen}
          onConnect={connect}
          onDisconnect={disconnect}
          onStartScreen={startScreenShare}
          onStopScreen={stopScreenShare}
          volume={volume}
          setVolume={setVolume}
        />
      </footer>
    </div>
  );
};

export default App;