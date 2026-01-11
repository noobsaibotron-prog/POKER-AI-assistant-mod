import React from 'react';
import { AudioVisualizerProps } from '../types.ts';

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive }) => {
  return (
    <div className="flex items-center justify-center gap-1 h-full w-full">
      {[1, 2, 3, 4, 5].map((bar) => (
        <div
          key={bar}
          className={`w-3 bg-emerald-500 rounded-full transition-all duration-150 ease-in-out ${
            isActive ? 'animate-bounce-custom' : 'h-1 bg-slate-600'
          }`}
          style={{
            height: isActive ? '30%' : '4px',
            animationDelay: `${bar * 0.1}s`
          }}
        />
      ))}
      <style>{`
        @keyframes bounce-custom {
          0%, 100% { height: 20%; opacity: 0.5; }
          50% { height: 80%; opacity: 1; box-shadow: 0 0 10px #10b981; }
        }
        .animate-bounce-custom {
          animation: bounce-custom 1s infinite;
        }
      `}</style>
    </div>
  );
};