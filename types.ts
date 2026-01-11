
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface Transcript {
  id: string;
  source: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface PokerGameState {
  winProbability: number; // 0-100
  equity?: number; // Technical equity %
  potOdds?: string; // e.g. "2.5:1"
  suggestedAction: 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL-IN' | 'WAITING';
  reasoning: string;
  handStrength: string; // e.g., "Coppia d'assi", "Progetto di colore"
  holeCards: string[]; // e.g., ["Ah", "Kd"]
  communityCards: string[]; // e.g., ["7s", "2c", "Qh"]
  opponentEstimatedCards?: string[]; // e.g., ["Qc", "Qs"]
  opponentRange?: string; // e.g., "Top 10% hands, high pairs"
  deepAnalysis?: string; // Detailed strategy from Pro model
}

export interface LiveConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

export interface ControlBarProps {
    isActive: boolean;
    isStreamingScreen: boolean;
    onConnect: () => void;
    onDisconnect: () => void;
    onStartScreen: () => void;
    onStopScreen: () => void;
    volume: number;
    setVolume: (val: number) => void;
}

export interface AudioVisualizerProps {
    isActive: boolean;
}

export interface PokerStatsDisplayProps {
    state: PokerGameState | null;
    isStreaming: boolean;
    onManualScan: () => void;
    onDeepAnalysis: () => void;
    isDeepAnalyzing: boolean;
}
