import React from 'react';
import { ControlBarProps } from '../types.ts';
import { MicrophoneIcon, StopIcon, ScreenShareIcon, VolumeIcon } from './Icons.tsx';

export const ControlBar: React.FC<ControlBarProps> = ({
  isActive,
  isStreamingScreen,
  onConnect,
  onDisconnect,
  onStartScreen,
  onStopScreen,
  volume,
  setVolume
}) => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
      
      {/* Connection Control */}
      <div className="flex items-center gap-4">
        {!isActive ? (
          <button
            onClick={onConnect}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-emerald-500/30"
          >
            <MicrophoneIcon className="w-5 h-5" />
            <span>Connect Live AI</span>
          </button>
        ) : (
          <button
            onClick={onDisconnect}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-red-500/30"
          >
            <StopIcon className="w-5 h-5" />
            <span>Disconnect</span>
          </button>
        )}
      </div>

      {/* Screen & Volume Controls (Only visible when connected for better UX flow, but can be always visible) */}
      <div className={`flex items-center gap-6 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        
        {/* Screen Share Toggle */}
        <button
          onClick={isStreamingScreen ? onStopScreen : onStartScreen}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isStreamingScreen 
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30' 
              : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
          }`}
        >
          <ScreenShareIcon className="w-5 h-5" />
          <span>{isStreamingScreen ? 'Stop Sharing' : 'Share Screen'}</span>
        </button>

        <div className="h-8 w-px bg-slate-700 mx-2"></div>

        {/* Volume Slider */}
        <div className="flex items-center gap-3">
          <VolumeIcon className="w-5 h-5 text-slate-400" />
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};