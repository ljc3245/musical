import React from 'react';

interface MetronomeUIProps {
  bpm: number;
  isPlaying: boolean;
  currentBeat: number;
  onBPMChange: (val: number) => void;
  onToggleStart: () => void;
  mode: 'standalone' | 'connected';
}

export const MetronomeUI: React.FC<MetronomeUIProps> = ({
  bpm,
  isPlaying,
  currentBeat,
  onBPMChange,
  onToggleStart,
  mode
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8 w-full max-w-md mx-auto">
      
      {/* Visual Indicator */}
      <div className="flex space-x-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-100 ${
              currentBeat === i 
                ? (i === 1 ? 'bg-red-500 scale-150 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-blue-400 scale-125 shadow-[0_0_10px_rgba(96,165,250,0.8)]')
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* BPM Display */}
      <div className="text-center">
        <div className="text-8xl font-black text-slate-100 tabular-nums tracking-tighter">
          {bpm}
        </div>
        <div className="text-slate-400 text-sm font-medium tracking-widest uppercase mt-2">BPM</div>
      </div>

      {/* Slider */}
      <div className="w-full px-8">
        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(e) => onBPMChange(Number(e.target.value))}
          className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>40</span>
          <span>240</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-6 pt-4">
        <button
          onClick={() => onBPMChange(bpm - 1)}
          className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all text-2xl font-bold"
        >
          -
        </button>

        <button
          onClick={onToggleStart}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all ${
            isPlaying
              ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-900/50'
              : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-900/50'
          }`}
        >
            {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 pl-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )}
        </button>

        <button
          onClick={() => onBPMChange(bpm + 1)}
          className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all text-2xl font-bold"
        >
          +
        </button>
      </div>
      
      <div className="text-xs text-slate-500 mt-4">
        Running in <span className={`font-bold ${mode === 'connected' ? 'text-blue-400' : 'text-slate-400'}`}>{mode === 'connected' ? 'Hardware Remote' : 'Software Local'}</span> Mode
      </div>
    </div>
  );
};
