import { CallSession } from '../models/types';
export declare class TranscriptLogger {
    logTranscript(callSession: CallSession, speaker: 'caller' | 'recipient' | 'bot', text: string): Promise<void>;
    startContinuousLogging(callSession: CallSession): Promise<void>;
}
export declare const transcriptLogger: TranscriptLogger;
//# sourceMappingURL=transcriptLogger.d.ts.map