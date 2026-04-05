/**
 * STTService (formerly WhisperTranscriptionService)
 *
 * Buffers audio chunks and uses Google Cloud STT for persistent transcription.
 * Updated for Cloud Run compatibility by removing local Whisper dependencies.
 */
declare class STTService {
    private audioBuffers;
    private tempDir;
    private flushIntervalMs;
    private minAudioBytes;
    constructor();
    /**
     * Add an audio chunk to the buffer for a specific call/user
     */
    addAudioChunk(callId: string, userId: string, otherUserId: string, audioDataBase64: string): void;
    /**
     * Flush buffered audio, transcribe with Google STT, store result
     */
    private flushAndTranscribe;
    /**
     * Stop buffering for a call — flush remaining audio and cleanup
     */
    stopCall(callId: string): Promise<void>;
}
declare const _default: STTService;
export default _default;
//# sourceMappingURL=WhisperTranscriptionService.d.ts.map