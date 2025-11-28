import React, { useState, useEffect, useCallback } from 'react';
import { OperatingMode, BluetoothCommand, TunerData } from './types';
import { bluetoothService } from './services/bluetoothService';
import { audioEngine } from './services/audioEngine';
import { MetronomeUI } from './components/MetronomeUI';
import { TunerUI } from './components/TunerUI';

const App: React.FC = () => {
  // --- Global State ---
  const [mode, setMode] = useState<OperatingMode>('standalone');
  const [activeTab, setActiveTab] = useState<'metronome' | 'tuner'>('metronome');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // --- Metronome State ---
  const [bpm, setBpm] = useState(120);
  const [isMetroPlaying, setIsMetroPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);

  // --- Tuner State ---
  const [isTunerActive, setIsTunerActive] = useState(false);
  const [tunerData, setTunerData] = useState<TunerData>({
    frequency: 0,
    noteName: '',
    cents: 0,
    isActive: false
  });

  // --- Bluetooth Event Listeners ---
  useEffect(() => {
    // Setup callback to handle data coming FROM the STM32
    bluetoothService.onDataReceived((data) => {
      // Expected formats: 
      // Metronome: "BEAT:1", "BEAT:2"
      // Tuner: "FREQ:440.0|NOTE:A|CENTS:0"
      
      const parts = data.trim().split('|');
      
      if (data.startsWith('BEAT:')) {
        const beatVal = parseInt(data.split(':')[1]);
        setCurrentBeat(beatVal);
      } 
      else if (data.startsWith('FREQ:')) {
        // Parse Tuner Data from Hardware
        const freq = parseFloat(parts.find(p => p.startsWith('FREQ:'))?.split(':')[1] || '0');
        const note = parts.find(p => p.startsWith('NOTE:'))?.split(':')[1] || '';
        const cents = parseInt(parts.find(p => p.startsWith('CENTS:'))?.split(':')[1] || '0');
        
        setTunerData({
          frequency: freq,
          noteName: note,
          cents: cents,
          isActive: true
        });
      }
    });
  }, []);

  // --- Connection Logic ---
  const handleBluetoothToggle = async () => {
    if (mode === 'connected') {
      bluetoothService.disconnect();
      setMode('standalone');
      setConnectionError(null);
    } else {
      try {
        await bluetoothService.connect();
        setMode('connected');
        setConnectionError(null);
        
        // Sync current state to device upon connection
        if (activeTab === 'metronome') {
             await bluetoothService.sendCommand(BluetoothCommand.SET_BPM, bpm);
        }
      } catch (err: any) {
        setConnectionError("Failed to connect. Ensure your device is advertising the UART service.");
        setMode('standalone');
      }
    }
  };

  // --- Dispatcher: Metronome ---
  const handleStartStopMetronome = useCallback(() => {
    const newState = !isMetroPlaying;
    setIsMetroPlaying(newState);

    if (mode === 'connected') {
      // Connected Mode: Send Command
      const cmd = newState ? BluetoothCommand.START_METRONOME : BluetoothCommand.STOP_METRONOME;
      bluetoothService.sendCommand(cmd);
      if (newState) {
          // Send BPM again to be safe
          bluetoothService.sendCommand(BluetoothCommand.SET_BPM, bpm);
      }
    } else {
      // Standalone Mode: Local Engine
      if (newState) {
        audioEngine.startMetronome(bpm, (beat) => setCurrentBeat(beat));
      } else {
        audioEngine.stopMetronome();
        setCurrentBeat(1);
      }
    }
  }, [mode, isMetroPlaying, bpm]);

  const handleBPMChange = useCallback((newBpm: number) => {
    setBpm(newBpm);

    if (mode === 'connected') {
       // Debounce this in a real app, but direct for now
       bluetoothService.sendCommand(BluetoothCommand.SET_BPM, newBpm);
    } else {
       audioEngine.updateBPM(newBpm);
    }
  }, [mode]);

  // --- Dispatcher: Tuner ---
  const handleToggleTuner = useCallback(() => {
    const newState = !isTunerActive;
    setIsTunerActive(newState);

    if (mode === 'connected') {
      // Connected Mode: Hardware Tuner
      const cmd = newState ? BluetoothCommand.START_TUNER : BluetoothCommand.STOP_TUNER;
      bluetoothService.sendCommand(cmd);
    } else {
      // Standalone Mode: Web Audio API
      if (newState) {
        audioEngine.startTuner((freq, note, cents) => {
          setTunerData({ frequency: freq, noteName: note, cents, isActive: true });
        });
      } else {
        audioEngine.stopTuner();
        setTunerData(prev => ({ ...prev, frequency: 0, isActive: false }));
      }
    }
  }, [mode, isTunerActive]);

  // Pause functionality when switching tabs
  useEffect(() => {
    // When switching tabs, simple behavior: stop everything to avoid conflicts
    if (isMetroPlaying) handleStartStopMetronome();
    if (isTunerActive) handleToggleTuner();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700 shadow-md z-10">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          DuoTool
        </h1>
        
        <button 
          onClick={handleBluetoothToggle}
          className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all ${
            mode === 'connected' 
              ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' 
              : 'bg-slate-700 text-slate-400 border border-slate-600'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${mode === 'connected' ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`} />
          <span>{mode === 'connected' ? 'Connected' : 'Standalone'}</span>
        </button>
      </header>

      {/* Error Toast */}
      {connectionError && (
        <div className="bg-red-900/80 text-red-100 p-2 text-center text-sm absolute w-full top-16 z-20 backdrop-blur-sm">
          {connectionError}
          <button onClick={() => setConnectionError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-900 to-slate-900 pointer-events-none" />
        
        <div className="relative z-0 h-full flex flex-col justify-center">
            {activeTab === 'metronome' ? (
            <MetronomeUI 
                bpm={bpm} 
                isPlaying={isMetroPlaying} 
                currentBeat={currentBeat}
                onBPMChange={handleBPMChange}
                onToggleStart={handleStartStopMetronome}
                mode={mode}
            />
            ) : (
            <TunerUI 
                data={tunerData}
                isActive={isTunerActive}
                onToggle={handleToggleTuner}
                mode={mode}
            />
            )}
        </div>
      </main>

      {/* Tab Bar */}
      <nav className="bg-slate-800 border-t border-slate-700 pb-safe">
        <div className="flex">
          <button
            onClick={() => setActiveTab('metronome')}
            className={`flex-1 py-4 flex flex-col items-center justify-center space-y-1 transition-colors ${
              activeTab === 'metronome' ? 'text-blue-400 bg-slate-800' : 'text-slate-500 hover:bg-slate-700/50'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-bold">Metronome</span>
          </button>
          
          <div className="w-px bg-slate-700 my-2" />

          <button
            onClick={() => setActiveTab('tuner')}
            className={`flex-1 py-4 flex flex-col items-center justify-center space-y-1 transition-colors ${
              activeTab === 'tuner' ? 'text-emerald-400 bg-slate-800' : 'text-slate-500 hover:bg-slate-700/50'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span className="text-xs font-bold">Tuner</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
