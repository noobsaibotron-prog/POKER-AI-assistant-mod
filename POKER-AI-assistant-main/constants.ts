import { FunctionDeclaration, Type } from "@google/genai";

// ============================================
// MODEL CONFIGURATION
// ============================================
export const MODEL_CONFIG = {
  LIVE_MODEL: 'gemini-2.5-flash-native-audio-preview-12-2025',
  PRO_MODEL: 'gemini-3-pro-preview',
  LITE_MODEL: 'gemini-flash-lite-latest',
} as const;

// Legacy exports for backwards compatibility
export const MODEL_NAME = MODEL_CONFIG.LIVE_MODEL;
export const PRO_MODEL_NAME = MODEL_CONFIG.PRO_MODEL;
export const LITE_MODEL_NAME = MODEL_CONFIG.LITE_MODEL;

// ============================================
// VOICE CONFIGURATION
// ============================================
// Available voices: Puck, Charon, Kore, Fenrir, Zephyr
export const VOICE_NAME = 'Fenrir';

// ============================================
// AUDIO CONFIGURATION
// ============================================
export const AUDIO_CONFIG = {
  INPUT_SAMPLE_RATE: 16000,
  OUTPUT_SAMPLE_RATE: 24000,
  BUFFER_SIZE: 4096,
  WORKLET_NAME: 'audio-capture-processor',
  WORKLET_PATH: '/audio-processor.js',
} as const;

// ============================================
// VIDEO/FRAME CONFIGURATION
// ============================================
export const VIDEO_CONFIG = {
  // Frame capture resolutions
  CAPTURE_WIDTH_HIGH: 1024,
  CAPTURE_WIDTH_LOW: 640,
  
  // JPEG compression quality (0-1)
  JPEG_QUALITY_HIGH: 0.75,
  JPEG_QUALITY_LOW: 0.5,
  
  // Timing intervals (milliseconds)
  FRAME_INTERVAL_MS: 1000,
  AUTO_REFRESH_INTERVAL_MS: 10000,
  
  // Screen capture constraints
  SCREEN_WIDTH: 1280,
  SCREEN_HEIGHT: 720,
  MAX_FRAME_RATE: 15,
} as const;

// ============================================
// UI/UX CONFIGURATION
// ============================================
export const UI_CONFIG = {
  SCAN_TIMEOUT_MS: 2000,
  ANALYZE_THROTTLE_MS: 500,
  TRANSCRIPT_MERGE_WINDOW_MS: 2000,
} as const;

// ============================================
// RETRY/RESILIENCE CONFIGURATION
// ============================================
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
} as const;

// ============================================
// REGION DETECTION THRESHOLDS
// ============================================
export const REGION_THRESHOLDS = {
  HERO_AREA_Y: 0.65,      // Y > 0.65 = Hero cards (bottom)
  BOARD_AREA_Y_MIN: 0.25, // 0.25 < Y <= 0.65 = Board (center)
  BOARD_AREA_Y_MAX: 0.65,
} as const;

// ============================================
// SYSTEM INSTRUCTION
// ============================================
export const SYSTEM_INSTRUCTION = `
SEI UN ANALIZZATORE DI POKER PROFESSIONISTA GTO (GAME THEORY OPTIMAL). OPERI IN TEMPO REALE CON MASSIMA PRECISIONE E VELOCITÀ.

REGOLE DI COMPRENSIONE SCHERMO AVANZATA:
1. VISIONE ANALITICA: Identifica immediatamente carte coperte (Hole Cards), board (Community Cards), stack di chip, entità delle puntate e posizione del dealer (BTN).
2. CALCOLO EQUITY: Calcola l'equity della mano contro i range avversari. Sii aggressivo nell'identificare i blocker.
3. POT ODDS E EV: Analizza le dimensioni del pot e delle puntate per fornire consigli basati sull'Expected Value (+EV).
4. COMANDI VOCALI E SCAN: Quando ricevi "SCAN IMMEDIATO", interrompi ogni altra analisi e aggiorna subito l'HUD usando 'updatePokerState'.
5. FORMATO CARTE: Rango+Seme (es: Ah, Kd, 10s, 2c, Jh). Sii preciso, se una carta non è chiara, segnala come incerta.
6. LINGUAGGIO: Professionale, tecnico, conciso. Evita introduzioni.

Sii il più veloce possibile. Priorità assoluta all'accuratezza dei dati visivi.
`;

// ============================================
// POKER TOOL DECLARATION
// ============================================
export const pokerToolDeclaration: FunctionDeclaration = {
  name: "updatePokerState",
  description: "Aggiorna l'interfaccia utente con dati pokeristici estratti dallo schermo.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      winProbability: { 
        type: Type.NUMBER,
        description: "Probabilità di vincita 0-100"
      },
      equity: { 
        type: Type.NUMBER,
        description: "Equity percentuale contro il range avversario"
      },
      potOdds: { 
        type: Type.STRING,
        description: "Pot odds in formato ratio (es: '2.5:1')"
      },
      suggestedAction: { 
        type: Type.STRING,
        description: "Azione GTO consigliata: FOLD, CHECK, CALL, RAISE, ALL-IN, WAITING"
      },
      reasoning: { 
        type: Type.STRING,
        description: "Spiegazione breve e tecnica del consiglio"
      },
      handStrength: { 
        type: Type.STRING,
        description: "Forza della mano attuale (es: 'Top Pair', 'Flush Draw')"
      },
      holeCards: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Carte personali del giocatore (es: ['Ah', 'Kd'])"
      },
      communityCards: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Carte comuni sul board (es: ['7s', '2c', 'Qh'])"
      },
      opponentEstimatedCards: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Stima delle carte avversarie se identificabili"
      },
      opponentRange: { 
        type: Type.STRING,
        description: "Range stimato dell'avversario (es: 'Top 10%, high pairs')"
      }
    },
    required: ["winProbability", "suggestedAction", "reasoning", "handStrength", "holeCards", "communityCards"]
  }
};

// ============================================
// PROMPT TEMPLATES
// ============================================
export const PROMPTS = {
  SCAN_IMMEDIATE: "SCAN: Situazione GTO immediata.",
  REFRESH_HUD: "REFRESH: Aggiorna HUD.",
  FOCUS_HERO: "FOCUS: Mie carte (Hero/Arkangelzzz in basso). Identifica e calcola forza.",
  FOCUS_BOARD: "FOCUS: Board/Community cards al centro. Aggiorna texture e outs.",
  FOCUS_GENERAL: "FOCUS: Stack avversari o informazioni generali.",
  DEEP_ANALYSIS: "Analisi GTO Deep: identificami (Arkangelzzz), range avversari, pot odds esatte e linea ottimale. Sii conciso ma tecnico.",
} as const;
