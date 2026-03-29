declare class WhisperTranscriptionService {
    private audioBuffers;
    private tempDir;
    private whisperBinaryPath;
    private modelPath;
    private flushIntervalMs;
    private minAudioBytes;
    constructor();
    /**
     * Add an audio chunk to the buffer for a specific call/user
     */
    addAudioChunk(callId: string, userId: string, otherUserId: string, audioDataBase64: string): void;
    /**
     * Flush buffered audio, write WAV, transcribe with Whisper, store result
     */
    private flushAndTranscribe;
    /**
     * Run whisper-cli.exe on a WAV file and return the transcript text
     */
    private runWhisper;
    /**
     * Write raw PCM data as a WAV file (16kHz, mono, 16-bit LE)
     */
    private writePcmToWav;
    /**
     * Stop buffering for a call — flush remaining audio and cleanup
     */
    stopCall(callId: string): Promise<void>;
}
declare const _default: WhisperTranscriptionService;
export default _default;
//# sourceMappingURL=WhisperTranscriptionService.d.ts.map