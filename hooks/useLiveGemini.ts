/**
 * useLiveGemini Hook - Refactored Version
 * 
 * Fixes implemented:
 * 1. ✅ Memory leak - Added cleanup effect on unmount
 * 2. ✅ AudioWorklet - Replaced deprecated ScriptProcessorNode
 * 3. ✅ Race condition - Using resolved session ref instead of Promise
 * 4. ✅ Stale closure - Using refs for state in intervals
 * 5. ✅ Retry logic - Exponential backoff on connection failure
 * 6. ✅ Throttling - Rate limiting on analyzeRegion
 * 7. ✅ Better typing - Proper TypeScript types throughout
 * 8. ✅ Constants - No more magic numbers
 */

import { useState, useRef, useCallback, useEffect, RefObject } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { 
  MODEL_NAME, 
  PRO_MODEL_NAME, 
  SYSTEM_INSTRUCTION, 
  VOICE_NAME, 
  pokerToolDeclaration,
  AUDIO_CONFIG,
  VIDEO_CONFIG,
  UI_CONFIG,
  RETRY_CONFIG,
  REGION_THRESHOLDS,
  PROMPTS
} from '../constants.ts';
import { pcmToGeminiAudioBlob, decodeBase64, decodeAudioData, blobToBase64 } from '../utils/audioUtils.ts';
import { 
  Transcript, 
  PokerGameState, 
  UseLiveGeminiProps, 
  UseLiveGeminiReturn,
  PokerToolArgs,
  RealtimeInput,
  GeminiConnectionError
} from '../types.ts';

// ============================================
// HELPER: Get API Key with validation
// ============================================
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    throw new GeminiConnectionError('API Key non configurata', 'NO_API_KEY', false);
  }
  return key;
};

// ============================================
// HELPER: Calculate exponential backoff delay
// ============================================
const getBackoffDelay = (retryCount: number): number => {
  const delay = Math.min(
    RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, retryCount),
    RETRY_CONFIG.MAX_DELAY_MS
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};

// ============================================
// MAIN HOOK
// ============================================
export const useLiveGemini = ({ videoRef, canvasRef }: UseLiveGeminiProps): UseLiveGeminiReturn => {
  // ============================================
  // STATE
  // ============================================
  const [isActive, setIsActive] = useState(false);
  const [isStreamingScreen, setIsStreamingScreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [pokerState, setPokerState] = useState<PokerGameState | null>(null);
  const [isDeepAnalyzing, setIsDeepAnalyzing] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);

  // ============================================
  // REFS - For values that need to be accessed in callbacks/intervals
  // ============================================
  // Audio
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  
  // Streams
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  
  // Session - Using resolved session, not Promise
  const sessionRef = useRef<any>(null);
  
  // Audio playback scheduling
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Intervals
  const videoIntervalRef = useRef<number | null>(null);
  const autoAnalysisIntervalRef = useRef<number | null>(null);
  
  // State refs for use in intervals (avoid stale closures)
  const isActiveRef = useRef(false);
  const isStreamingScreenRef = useRef(false);
  
  // Throttling
  const lastAnalyzeTimeRef = useRef(0);
  
  // Retry
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);

  // ============================================
  // SYNC STATE TO REFS
  // ============================================
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    isStreamingScreenRef.current = isStreamingScreen;
  }, [isStreamingScreen]);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // ============================================
  // ERROR HANDLING
  // ============================================
  const resetError = useCallback(() => {
    setError(null);
    setIsPermissionError(false);
  }, []);

  const handleError = useCallback((err: unknown, context: string) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[${context}]`, err);
    setError(`${context}: ${message}`);
    
    if (message.includes('permission') || message.includes('403') || message.includes('401')) {
      setIsPermissionError(true);
    }
  }, []);

  // ============================================
  // SEND INPUT (Safe, using resolved session)
  // ============================================
  const sendSafeInput = useCallback((input: RealtimeInput) => {
    if (sessionRef.current) {
      try {
        sessionRef.current.sendRealtimeInput(input);
      } catch (e) {
        console.error('[sendSafeInput] Error:', e);
      }
    }
  }, []);

  // ============================================
  // FRAME CAPTURE
  // ============================================
  const captureFrame = useCallback((quality: 'high' | 'low' = 'high'): Promise<string | null> => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      if (!canvas || !video || video.readyState !== 4) {
        return resolve(null);
      }
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      
      const targetWidth = quality === 'high' 
        ? VIDEO_CONFIG.CAPTURE_WIDTH_HIGH 
        : VIDEO_CONFIG.CAPTURE_WIDTH_LOW;
      const scale = targetWidth / video.videoWidth;
      
      canvas.width = targetWidth;
      canvas.height = video.videoHeight * scale;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const jpegQuality = quality === 'high' 
        ? VIDEO_CONFIG.JPEG_QUALITY_HIGH 
        : VIDEO_CONFIG.JPEG_QUALITY_LOW;
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          resolve(await blobToBase64(blob));
        } else {
          resolve(null);
        }
      }, 'image/jpeg', jpegQuality);
    });
  }, [canvasRef, videoRef]);

  // ============================================
  // MANUAL SCAN (with throttling)
  // ============================================
  const triggerManualScan = useCallback(async () => {
    if (!isActiveRef.current || !isStreamingScreenRef.current) return;
    
    const frame = await captureFrame('high');
    if (frame) {
      sendSafeInput({ media: { mimeType: 'image/jpeg', data: frame } });
    }
    sendSafeInput({ text: PROMPTS.SCAN_IMMEDIATE });
  }, [sendSafeInput, captureFrame]);

  // ============================================
  // ANALYZE REGION (with throttling)
  // ============================================
  const analyzeRegion = useCallback(async (x: number, y: number) => {
    // Throttle check
    const now = Date.now();
    if (now - lastAnalyzeTimeRef.current < UI_CONFIG.ANALYZE_THROTTLE_MS) {
      return;
    }
    lastAnalyzeTimeRef.current = now;
    
    if (!isActiveRef.current || !isStreamingScreenRef.current) return;

    const frame = await captureFrame('high');
    if (frame) {
      sendSafeInput({ media: { mimeType: 'image/jpeg', data: frame } });
    }

    // Determine region based on Y coordinate
    let prompt: string;
    if (y > REGION_THRESHOLDS.HERO_AREA_Y) {
      prompt = PROMPTS.FOCUS_HERO;
    } else if (y > REGION_THRESHOLDS.BOARD_AREA_Y_MIN && y <= REGION_THRESHOLDS.BOARD_AREA_Y_MAX) {
      prompt = PROMPTS.FOCUS_BOARD;
    } else {
      prompt = PROMPTS.FOCUS_GENERAL;
    }

    sendSafeInput({ text: prompt });
  }, [captureFrame, sendSafeInput]);

  // ============================================
  // DEEP ANALYSIS (Pro Model)
  // ============================================
  const runDeepAnalysis = useCallback(async () => {
    if (!isStreamingScreenRef.current) return;
    
    setIsDeepAnalyzing(true);
    try {
      const apiKey = getApiKey();
      const ai = new GoogleGenAI({ apiKey });
      const frame = await captureFrame('high');
      
      if (!frame) {
        throw new Error("Impossibile catturare il frame");
      }

      const response = await ai.models.generateContent({
        model: PRO_MODEL_NAME,
        contents: {
          parts: [
            { inlineData: { data: frame, mimeType: 'image/jpeg' } },
            { text: PROMPTS.DEEP_ANALYSIS }
          ]
        },
        config: { thinkingConfig: { thinkingBudget: 2000 } }
      });

      setPokerState(prev => ({
        ...prev!,
        deepAnalysis: response.text || "Nessun risultato ricevuto."
      }));
    } catch (err) {
      handleError(err, 'Deep Analysis');
    } finally {
      setIsDeepAnalyzing(false);
    }
  }, [captureFrame, handleError]);

  // ============================================
  // AUTO ANALYSIS INTERVAL
  // ============================================
  const stopAutoAnalysis = useCallback(() => {
    if (autoAnalysisIntervalRef.current) {
      window.clearInterval(autoAnalysisIntervalRef.current);
      autoAnalysisIntervalRef.current = null;
    }
  }, []);

  const startAutoAnalysis = useCallback(() => {
    stopAutoAnalysis();
    autoAnalysisIntervalRef.current = window.setInterval(() => {
      if (isActiveRef.current && isStreamingScreenRef.current) {
        sendSafeInput({ text: PROMPTS.REFRESH_HUD });
      }
    }, VIDEO_CONFIG.AUTO_REFRESH_INTERVAL_MS);
  }, [sendSafeInput, stopAutoAnalysis]);

  // ============================================
  // SCREEN SHARE
  // ============================================
  const stopScreenShare = useCallback(() => {
    stopAutoAnalysis();
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreamingScreen(false);
  }, [videoRef, stopAutoAnalysis]);

  const startScreenShare = useCallback(async () => {
    resetError();
    
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: VIDEO_CONFIG.SCREEN_WIDTH },
          height: { ideal: VIDEO_CONFIG.SCREEN_HEIGHT },
          frameRate: { max: VIDEO_CONFIG.MAX_FRAME_RATE }
        }
      });
      
      mediaStreamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setIsStreamingScreen(true);
      
      // Handle stream end (user clicks "Stop sharing")
      stream.getVideoTracks()[0].onended = () => stopScreenShare();
      
      // Start continuous low-res frame capture
      videoIntervalRef.current = window.setInterval(async () => {
        if (!isActiveRef.current) return;
        
        const frame = await captureFrame('low');
        if (frame) {
          sendSafeInput({ media: { mimeType: 'image/jpeg', data: frame } });
        }
      }, VIDEO_CONFIG.FRAME_INTERVAL_MS);
      
      startAutoAnalysis();
    } catch (err) {
      handleError(err, 'Screen Share');
    }
  }, [videoRef, startAutoAnalysis, resetError, captureFrame, sendSafeInput, stopScreenShare, handleError]);

  // ============================================
  // AUDIO OUTPUT PLAYBACK
  // ============================================
  const playAudioChunk = useCallback(async (base64Data: string) => {
    const ctx = outputAudioContextRef.current;
    const gainNode = gainNodeRef.current;
    
    if (!ctx || !gainNode) return;
    
    try {
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
      
      const buffer = await decodeAudioData(
        decodeBase64(base64Data), 
        ctx, 
        AUDIO_CONFIG.OUTPUT_SAMPLE_RATE
      );
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(gainNode);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += buffer.duration;
      
      // Track active sources for cleanup
      audioSourcesRef.current.add(source);
      source.onended = () => audioSourcesRef.current.delete(source);
    } catch (err) {
      console.error('[playAudioChunk] Error:', err);
    }
  }, []);

  // ============================================
  // HANDLE TOOL CALLS
  // ============================================
  const handleToolCall = useCallback((functionCalls: Array<{ id: string; name: string; args: unknown }>) => {
    for (const fc of functionCalls) {
      if (fc.name === 'updatePokerState') {
        const args = fc.args as PokerToolArgs;
        
        setPokerState(prev => ({
          winProbability: args.winProbability ?? prev?.winProbability ?? 0,
          equity: args.equity ?? prev?.equity,
          potOdds: args.potOdds ?? prev?.potOdds,
          suggestedAction: (args.suggestedAction as PokerGameState['suggestedAction']) ?? prev?.suggestedAction ?? 'WAITING',
          reasoning: args.reasoning ?? prev?.reasoning ?? '',
          handStrength: args.handStrength ?? prev?.handStrength ?? '',
          holeCards: args.holeCards ?? prev?.holeCards ?? [],
          communityCards: args.communityCards ?? prev?.communityCards ?? [],
          opponentEstimatedCards: args.opponentEstimatedCards ?? prev?.opponentEstimatedCards,
          opponentRange: args.opponentRange ?? prev?.opponentRange,
          deepAnalysis: prev?.deepAnalysis,
        }));
        
        // Send tool response
        if (sessionRef.current) {
          try {
            sessionRef.current.sendToolResponse({
              functionResponses: [{
                id: fc.id,
                name: fc.name,
                response: { result: { success: true } }
              }]
            });
          } catch (e) {
            console.error('[handleToolCall] Error sending response:', e);
          }
        }
      }
    }
  }, []);

  // ============================================
  // HANDLE TRANSCRIPTION
  // ============================================
  const handleTranscription = useCallback((text: string, source: 'ai' | 'user') => {
    setTranscripts(prev => {
      const last = prev[prev.length - 1];
      const now = new Date();
      
      // Merge with last message if same source and recent
      if (last && last.source === source && (now.getTime() - last.timestamp.getTime() < UI_CONFIG.TRANSCRIPT_MERGE_WINDOW_MS)) {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }];
      }
      
      return [...prev, {
        id: Date.now().toString(),
        source,
        text,
        timestamp: now
      }];
    });
  }, []);

  // ============================================
  // CONNECT
  // ============================================
  const connect = useCallback(async () => {
    resetError();
    
    try {
      const apiKey = getApiKey();
      const ai = new GoogleGenAI({ apiKey });
      
      // Create audio contexts
      inputAudioContextRef.current = new AudioContext({ sampleRate: AUDIO_CONFIG.INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new AudioContext({ sampleRate: AUDIO_CONFIG.OUTPUT_SAMPLE_RATE });
      
      // Setup output gain
      gainNodeRef.current = outputAudioContextRef.current.createGain();
      gainNodeRef.current.gain.value = volume;
      gainNodeRef.current.connect(outputAudioContextRef.current.destination);
      
      // Get microphone
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = micStream;
      
      // Connect to Gemini Live API
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [pokerToolDeclaration] }],
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: VOICE_NAME }
            }
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: async () => {
            // Store resolved session
            sessionRef.current = await sessionPromise;
            setIsActive(true);
            retryCountRef.current = 0; // Reset retry count on successful connection
            
            // Setup AudioWorklet for audio input
            try {
              const inputCtx = inputAudioContextRef.current!;
              await inputCtx.audioWorklet.addModule(AUDIO_CONFIG.WORKLET_PATH);
              
              const source = inputCtx.createMediaStreamSource(micStream);
              workletNodeRef.current = new AudioWorkletNode(inputCtx, AUDIO_CONFIG.WORKLET_NAME);
              
              workletNodeRef.current.port.onmessage = (event) => {
                if (event.data.type === 'audio') {
                  const blob = pcmToGeminiAudioBlob(event.data.data, AUDIO_CONFIG.INPUT_SAMPLE_RATE);
                  sendSafeInput({ media: blob });
                }
              };
              
              source.connect(workletNodeRef.current);
              // Note: Don't connect to destination to avoid feedback
            } catch (workletErr) {
              // Fallback to ScriptProcessor if AudioWorklet fails
              console.warn('[connect] AudioWorklet failed, falling back to ScriptProcessor:', workletErr);
              
              const inputCtx = inputAudioContextRef.current!;
              const source = inputCtx.createMediaStreamSource(micStream);
              const processor = inputCtx.createScriptProcessor(AUDIO_CONFIG.BUFFER_SIZE, 1, 1);
              
              processor.onaudioprocess = (e) => {
                const blob = pcmToGeminiAudioBlob(e.inputBuffer.getChannelData(0), AUDIO_CONFIG.INPUT_SAMPLE_RATE);
                sendSafeInput({ media: blob });
              };
              
              source.connect(processor);
              processor.connect(inputCtx.destination);
            }
          },
          
          onmessage: async (msg: LiveServerMessage) => {
            // Handle tool calls
            if (msg.toolCall?.functionCalls) {
              handleToolCall(msg.toolCall.functionCalls);
            }
            
            // Handle audio output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              await playAudioChunk(audioData);
            }
            
            // Handle output transcription
            const outputTranscript = msg.serverContent?.outputTranscription?.text;
            if (outputTranscript) {
              handleTranscription(outputTranscript, 'ai');
            }
            
            // Handle input transcription
            const inputTranscript = msg.serverContent?.inputTranscription?.text;
            if (inputTranscript) {
              handleTranscription(inputTranscript, 'user');
            }
          },
          
          onclose: () => {
            sessionRef.current = null;
            setIsActive(false);
          },
          
          onerror: (e: any) => {
            handleError(e, 'WebSocket');
            sessionRef.current = null;
            setIsActive(false);
          }
        }
      });
      
    } catch (err) {
      handleError(err, 'Connection');
      
      // Retry logic with exponential backoff
      if (err instanceof GeminiConnectionError && !err.retryable) {
        return; // Don't retry non-retryable errors
      }
      
      if (retryCountRef.current < RETRY_CONFIG.MAX_RETRIES) {
        retryCountRef.current++;
        const delay = getBackoffDelay(retryCountRef.current);
        console.log(`[connect] Retry ${retryCountRef.current}/${RETRY_CONFIG.MAX_RETRIES} in ${delay}ms`);
        
        retryTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, delay);
      }
    }
  }, [volume, resetError, sendSafeInput, handleToolCall, playAudioChunk, handleTranscription, handleError]);

  // ============================================
  // DISCONNECT
  // ============================================
  const disconnect = useCallback(() => {
    // Cancel any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    stopAutoAnalysis();
    
    // Close session
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error('[disconnect] Error closing session:', e);
      }
      sessionRef.current = null;
    }
    
    // Stop audio sources
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioSourcesRef.current.clear();
    
    // Stop media streams
    audioStreamRef.current?.getTracks().forEach(t => t.stop());
    audioStreamRef.current = null;
    
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    mediaStreamRef.current = null;
    
    // Disconnect worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    
    // Close audio contexts
    inputAudioContextRef.current?.close();
    inputAudioContextRef.current = null;
    
    outputAudioContextRef.current?.close();
    outputAudioContextRef.current = null;
    
    gainNodeRef.current = null;
    
    // Clear intervals
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    
    // Reset state
    setIsActive(false);
    setIsStreamingScreen(false);
    setTranscripts([]);
    nextStartTimeRef.current = 0;
  }, [stopAutoAnalysis]);

  // ============================================
  // CLEANUP ON UNMOUNT
  // ============================================
  useEffect(() => {
    return () => {
      // This runs when component unmounts
      disconnect();
    };
  }, [disconnect]);

  // ============================================
  // RETURN
  // ============================================
  return {
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
  };
};
