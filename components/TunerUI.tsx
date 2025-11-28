import React, { useEffect, useRef } from 'react';
import { TunerData } from '../types';

interface TunerUIProps {
  data: TunerData;
  isActive: boolean;
  onToggle: () => void;
  mode: 'standalone' | 'connected';
}

export const TunerUI: React.FC<TunerUIProps> = ({
  data,
  isActive,
  onToggle,
  mode
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Draw the needle
    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        const ctx = canvas.getContext('2d');
        if(!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0,0, w, h);

        // Arc background
        ctx.beginPath();
        ctx.arc(w/2, h, w/2 - 20, Math.PI, 2 * Math.PI);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 10;
        ctx.stroke();

        // Center Marker
        ctx.beginPath();
        ctx.moveTo(w/2, 20);
        ctx.lineTo(w/2, 50);
        ctx.strokeStyle = '#10b981'; // Emerald 500
        ctx.lineWidth = 4;
        ctx.stroke();

        if (isActive && data.frequency > 0) {
            // Calculate angle based on cents (-50 to +50)
            // -50 cents = 180 deg (PI)
            // 0 cents = 270 deg (1.5 PI)
            // +50 cents = 360 deg (2 PI)
            
            // Mapping -50..50 to radians
            // Range is +/- 45 degrees from center? 
            // Let's say -50 is 225deg, +50 is 315deg. Center is 270.
            const maxDeflection = 45 * (Math.PI / 180);
            const deflection = (data.cents / 50) * maxDeflection;
            const angle = 1.5 * Math.PI + deflection;

            // Draw Needle
            ctx.save();
            ctx.translate(w/2, h);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -(w/2 - 30));
            ctx.strokeStyle = Math.abs(data.cents) < 5 ? '#10b981' : '#f43f5e';
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Pivot
            ctx.beginPath();
            ctx.arc(0, 0, 10, 0, 2*Math.PI);
            ctx.fillStyle = '#f8fafc';
            ctx.fill();
            ctx.restore();
        }

    }, [data.cents, isActive, data.frequency]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8 w-full max-w-md mx-auto">
      
      {/* Tuner Display */}
      <div className="relative flex flex-col items-center">
        <canvas ref={canvasRef} width={300} height={160} className="mb-4" />
        
        {isActive && data.frequency > 0 ? (
             <div className="absolute top-[80px] flex flex-col items-center">
                <div className={`text-9xl font-black tabular-nums tracking-tighter ${
                    Math.abs(data.cents) < 5 ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]' : 'text-slate-100'
                }`}>
                {data.noteName || '--'}
                </div>
                <div className="flex items-center space-x-4 mt-2">
                    <span className="text-slate-400 font-mono text-lg">{data.frequency.toFixed(1)} Hz</span>
                    <span className={`font-bold text-lg ${data.cents > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                        {data.cents > 0 ? '+' : ''}{data.cents}¢
                    </span>
                </div>
            </div>
        ) : (
            <div className="absolute top-[100px] text-slate-500 text-xl font-medium animate-pulse">
                {isActive ? 'Listening...' : 'Ready'}
            </div>
        )}
      </div>

      {/* Start Button */}
      <button
        onClick={onToggle}
        className={`w-full max-w-xs py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all ${
          isActive
            ? 'bg-rose-600 text-white hover:bg-rose-500'
            : 'bg-emerald-500 text-white hover:bg-emerald-400'
        }`}
      >
        {isActive ? 'Stop Tuner' : 'Start Tuner'}
      </button>

      <div className="text-xs text-slate-500 mt-4 px-8 text-center">
        {mode === 'connected' 
            ? 'Receiving analysis from external hardware via Bluetooth.' 
            : 'Using local Microphone and Javascript FFT/Autocorrelation.'}
      </div>
    </div>
  );
};
