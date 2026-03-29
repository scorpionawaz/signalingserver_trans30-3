import { CallSession } from '../models/types';
export declare class UrgencyDetector {
    private detectionBuffer;
    private readonly DETECTION_TIME_MS;
    private readonly MIN_WORDS;
    startDetection(callSession: CallSession): Promise<void>;
    addTranscriptChunk(callId: string, text: string): void;
    private performDetection;
    getInitialTranscript(callId: string): string;
    clearBuffer(callId: string): void;
}
export declare const urgencyDetector: UrgencyDetector;
//# sourceMappingURL=urgencyDetector.d.ts.map