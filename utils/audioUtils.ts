// Calculates the root mean square (volume level) from audio data
export function calculateRMS(data: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

// Helper to create a blob from chunks
export function createAudioBlob(chunks: Blob[], mimeType: string = 'audio/webm'): Blob {
  return new Blob(chunks, { type: mimeType });
}
