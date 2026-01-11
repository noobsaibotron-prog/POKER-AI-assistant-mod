import { Blob } from '@google/genai';

/**
 * Converts a Float32Array of audio data to a PCM 16-bit array,
 * then base64 encodes it for the Gemini API.
 */
export function pcmToGeminiAudioBlob(data: Float32Array, sampleRate: number): Blob {
    const l = data.length;
    // Convert Float32 (-1.0 to 1.0) to Int16 (-32768 to 32767)
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        // Clamp values just in case
        let s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Encode to base64
    const binary = new Uint8Array(int16.buffer);
    let binaryString = '';
    const len = binary.byteLength;
    for (let i = 0; i < len; i++) {
        binaryString += String.fromCharCode(binary[i]);
    }
    const base64 = btoa(binaryString);

    return {
        data: base64,
        mimeType: `audio/pcm;rate=${sampleRate}`,
    };
}

/**
 * Decodes a base64 string to a Uint8Array.
 */
export function decodeBase64(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

/**
 * Decodes raw PCM 16-bit audio data into an AudioBuffer.
 */
export async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number = 1
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            // Convert Int16 back to Float32
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

/**
 * Converts a Blob to a Base64 string.
 */
export function blobToBase64(blob: globalThis.Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}