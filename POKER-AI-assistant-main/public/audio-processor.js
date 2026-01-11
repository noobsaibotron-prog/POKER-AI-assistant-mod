/**
 * AudioWorklet Processor for real-time audio capture
 * Replaces deprecated ScriptProcessorNode
 * Runs on a separate thread for better performance
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const channelData = input[0];
      
      for (let i = 0; i < channelData.length; i++) {
        this.buffer[this.bufferIndex++] = channelData[i];
        
        // When buffer is full, send it to main thread
        if (this.bufferIndex >= this.bufferSize) {
          // Copy buffer to avoid issues with reuse
          const audioData = this.buffer.slice(0);
          this.port.postMessage({ type: 'audio', data: audioData });
          this.bufferIndex = 0;
        }
      }
    }
    
    // Return true to keep processor alive
    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
