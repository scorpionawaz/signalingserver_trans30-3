export declare class GoogleSTTService {
    private client;
    constructor();
    /**
     * Creates a streaming recognize session.
     * @param onTranscript Callback when a final/interim transcript is received
     * @param onError Callback when an error occurs
     */
    createStream(onTranscript: (transcript: string, isFinal: boolean) => void, onError: (error: Error) => void): {
        /**
         * Writes a base64 encoded audio chunk to the stream
         */
        writeBlock: (base64Data: string) => void;
        /**
         * Closes the stream gracefully
         */
        close: () => void;
    };
}
declare const _default: GoogleSTTService;
export default _default;
//# sourceMappingURL=GoogleSTTService.d.ts.map