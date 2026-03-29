export declare class AIServerClient {
    private baseUrl;
    constructor();
    classifyUrgency(transcript: string, callerId: string, targetUserId: string): Promise<{
        urgency: 'HIGH' | 'LOW';
        confidence: number;
        reasoning: string;
    }>;
    logTranscript(callId: string, timestamp: number, speaker: 'caller' | 'recipient' | 'bot', text: string): Promise<boolean>;
    summarizeCall(callId: string): Promise<any>;
}
export declare const aiServerClient: AIServerClient;
//# sourceMappingURL=aiServerClient.d.ts.map