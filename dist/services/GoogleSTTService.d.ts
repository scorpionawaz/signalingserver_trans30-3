export declare class GoogleSTTService {
    private client;
    constructor();
    /**
     * One-off (batch) transcription for an audio buffer.
     * Useful for replacement of Whisper 7-second chunking logic.
     */
    recognize(audioBuffer: Buffer): Promise<string>;
    /**
     * Creates a streaming recognize session.
     * @param onTranscript Callback when a final/interim transcript is received
     * @param onError Callback when an error occurs
     * @param userId Optional user ID for DB persistence
     * @param otherUserId Optional recipient user ID for DB persistence
     */
    createStream(onTranscript: (transcript: string, isFinal: boolean) => void, onError: (error: Error) => void, userId?: string, otherUserId?: string): {
        writeBlock: (data: string | Buffer) => void;
        close: () => void;
    };
}
declare const _default: GoogleSTTService;
export default _default;
//# sourceMappingURL=GoogleSTTService.d.ts.map