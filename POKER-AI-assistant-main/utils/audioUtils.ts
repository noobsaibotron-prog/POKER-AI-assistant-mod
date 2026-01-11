/**
 * Audio Utilities for Gemini Live API
 * 
 * Handles conversion between browser audio formats and Gemini API formats:
 * - Input: Float32 (Web Audio API) → Int16 PCM → Base64 (Gemini)
 * - Output: Base64 (Gemini) → Int16 PCM → Float32 (Web Audio API)
 */

import { Blob as GeminiBlob } from '@google/genai';

// Type for our audio blob (matches Gemini's expected format)
export interface AudioBlob {
  data: string; // Base64 encoded PCM
  mimeType: string;
}

/**
 * Converts Float32 audio data to a Gemini-compatible audio blob.
 * 
 * @param data - Float32Array from Web Audio API (values -1.0 to 1.0)
 * @param sampleRate - Sample rate in Hz (typically 16000 for input)
 * @returns GeminiBlob with base64-encoded PCM16 data
 * 
 * @example
 * ```ts
 * const audioData = audioBuffer.getChannelData(0);
 * const blob = pcmToGeminiAudioBlob(audioData, 16000);
 * sendToGemini({ media: blob });
 * ```
 */
export function pcmToGeminiAudioBlob(data: Float32Array, sampleRate: number): GeminiBlob {
  const length = data.length;
  const int16 = new Int16Array(length);
  
  // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
  for (let i = 0; i < length; i++) {
    // Clamp values to prevent overflow
    const sample = Math.max(-1, Math.min(1, data[i]));
    // Scale to Int16 range
    int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  
  // Convert to base64
  const binary = new Uint8Array(int16.buffer);
  const base64 = uint8ArrayToBase64(binary);
  
  return {
    data: base64,
    mimeType: `audio/pcm;rate=${sampleRate}`,
  };
}

/**
 * Decodes a base64 string to a Uint8Array.
 * 
 * @param base64 - Base64 encoded string
 * @returns Decoded bytes as Uint8Array
 */
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Converts Uint8Array to base64 string.
 * More efficient than String.fromCharCode for large arrays.
 * 
 * @param bytes - Uint8Array to encode
 * @returns Base64 encoded string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Process in chunks to avoid stack overflow on large arrays
  const chunkSize = 0x8000; // 32KB chunks
  const chunks: string[] = [];
  
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  
  return btoa(chunks.join(''));
}

/**
 * Decodes raw PCM 16-bit audio data into a Web Audio API AudioBuffer.
 * 
 * @param data - Uint8Array containing Int16 PCM samples
 * @param ctx - AudioContext for creating the buffer
 * @param sampleRate - Sample rate of the audio (typically 24000 for Gemini output)
 * @param numChannels - Number of audio channels (default: 1 for mono)
 * @returns AudioBuffer ready for playback
 * 
 * @example
 * ```ts
 * const pcmData = decodeBase64(geminiAudioResponse);
 * const buffer = await decodeAudioData(pcmData, audioContext, 24000);
 * const source = audioContext.createBufferSource();
 * source.buffer = buffer;
 * source.start();
 * ```
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number = 1
): Promise<AudioBuffer> {
  // Interpret bytes as Int16
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  
  // Create audio buffer
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  
  // Convert Int16 back to Float32 for each channel
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Convert Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  
  return buffer;
}

/**
 * Converts a Blob to a Base64 string (without the data URL prefix).
 * 
 * @param blob - Blob to convert (typically from canvas.toBlob)
 * @returns Promise resolving to base64-encoded string
 * 
 * @example
 * ```ts
 * canvas.toBlob(async (blob) => {
 *   if (blob) {
 *     const base64 = await blobToBase64(blob);
 *     sendToGemini({ media: { data: base64, mimeType: 'image/jpeg' } });
 *   }
 * }, 'image/jpeg', 0.8);
 * ```
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read blob as base64'));
    };
    
    reader.readAsDataURL(blob);
  });
}

/**
 * Calculates the RMS (Root Mean Square) level of audio data.
 * Useful for creating audio level meters.
 * 
 * @param data - Float32Array of audio samples
 * @returns RMS level (0.0 to 1.0)
 */
export function calculateRMSLevel(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

/**
 * Converts RMS level to decibels.
 * 
 * @param rms - RMS level (0.0 to 1.0)
 * @returns Level in dB (typically -60 to 0)
 */
export function rmsToDecibels(rms: number): number {
  if (rms === 0) return -Infinity;
  return 20 * Math.log10(rms);
}
