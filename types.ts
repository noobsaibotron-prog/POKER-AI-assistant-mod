import { RefObject } from 'react';

// ============================================
// CONNECTION & STATUS
// ============================================
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

export interface ConnectionState {
  status: ConnectionStatus;
  error: string | null;
  retryCount: number;
  lastConnectedAt: Date | null;
}

// ============================================
// POKER GAME STATE
// ============================================
export type SuggestedAction = 'FOLD' | 'CHECK' | 'CALL' | 'RAISE' | 'ALL-IN' | 'WAITING';

export interface PokerGameState {
  winProbability: number; // 0-100
  equity?: number; // Technical equity %
  potOdds?: string; // e.g. "2.5:1"
  suggestedAction: SuggestedAction;
  reasoning: string;
  handStrength: string; // e.g., "Coppia d'assi", "Progetto di colore"
  holeCards: string[]; // e.g., ["Ah", "Kd"]
  communityCards: string[]; // e.g., ["7s", "2c", "Qh"]
  opponentEstimatedCards?: string[]; // e.g., ["Qc", "Qs"]
  opponentRange?: string; // e.g., "Top 10% hands, high pairs"
  deepAnalysis?: string; // Detailed strategy from Pro model
}

// Type guard for PokerGameState
export function isPokerGameState(obj: unknown): obj is PokerGameState {
  if (typeof obj !== 'object' || obj === null) return false;
  const state = obj as Record<string, unknown>;
  return (
    typeof state.winProbability === 'number' &&
    typeof state.suggestedAction === 'string' &&
    typeof state.reasoning === 'string' &&
    typeof state.handStrength === 'string' &&
    Array.isArray(state.holeCards) &&
    Array.isArray(state.communityCards)
  );
}

// ============================================
// TOOL ARGUMENTS (from Gemini)
// ============================================
export interface PokerToolArgs {
  winProbability?: number;
  equity?: number;
  potOdds?: string;
  suggestedAction?: string;
  reasoning?: string;
  handStrength?: string;
  holeCards?: string[];
  communityCards?: string[];
  opponentEstimatedCards?: string[];
  opponentRange?: string;
}

// ============================================
// TRANSCRIPTS
// ============================================
export type TranscriptSource = 'user' | 'ai' | 'system';

export interface Transcript {
  id: string;
  source: TranscriptSource;
  text: string;
  timestamp: Date;
}

// ============================================
// AUDIO
// ============================================
export interface AudioState {
  isCapturing: boolean;
  isPlaying: boolean;
  volume: number;
  inputLevel: number;
  outputLevel: number;
}

export interface AudioBlob {
  data: string; // Base64 encoded
  mimeType: string;
}

// ============================================
// VIDEO/SCREEN CAPTURE
// ============================================
export interface ScreenCaptureState {
  isStreaming: boolean;
  width: number;
  height: number;
  frameRate: number;
}

export interface FrameData {
  data: string; // Base64 encoded JPEG
  width: number;
  height: number;
  timestamp: number;
}

// ============================================
// LIVE SESSION (Gemini API)
// ============================================
export interface LiveSessionConfig {
  model: string;
  systemInstruction: string;
  voiceName: string;
}

export interface RealtimeInput {
  text?: string;
  media?: {
    mimeType: string;
    data: string;
  };
}

export interface FunctionCallData {
  id: string;
  name: string;
  args: PokerToolArgs;
}

export interface ToolResponse {
  functionResponses: Array<{
    id: string;
    name: string;
    response: { result: unknown };
  }>;
}

// ============================================
// HOOK PROPS & RETURNS
// ============================================
export interface UseLiveGeminiProps {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
}

export interface UseLiveGeminiReturn {
  // Connection
  connect: () => Promise<void>;
  disconnect: () => void;
  isActive: boolean;
  
  // Screen sharing
  isStreamingScreen: boolean;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  
  // Audio
  volume: number;
  setVolume: (val: number) => void;
  
  // Game state
  pokerState: PokerGameState | null;
  
  // Errors
  error: string | null;
  isPermissionError: boolean;
  resetError: () => void;
  
  // Analysis
  triggerManualScan: () => Promise<void>;
  runDeepAnalysis: () => Promise<void>;
  isDeepAnalyzing: boolean;
  analyzeRegion: (x: number, y: number) => Promise<void>;
  
  // Transcripts
  transcripts: Transcript[];
}

// ============================================
// COMPONENT PROPS
// ============================================
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
  inputLevel?: number;
  outputLevel?: number;
}

export interface PokerStatsDisplayProps {
  state: PokerGameState | null;
  isStreaming: boolean;
  onManualScan: () => void;
  onDeepAnalysis: () => void;
  isDeepAnalyzing: boolean;
}

export interface VideoPreviewProps {
  videoRef: RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  onVideoClick?: (x: number, y: number) => void;
}

export interface TranscriptionLogProps {
  transcripts: Transcript[];
}

export interface ActivityLogProps {
  transcripts: Transcript[];
}

// ============================================
// ERROR TYPES
// ============================================
export class GeminiConnectionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'GeminiConnectionError';
  }
}

export class AudioContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioContextError';
  }
}

export class ScreenCaptureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScreenCaptureError';
  }
}

// ============================================
// UTILITY TYPES
// ============================================
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncFunction<T = void> = () => Promise<T>;
