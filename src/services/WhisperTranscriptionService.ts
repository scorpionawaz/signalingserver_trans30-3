import pino from 'pino';
import { config } from '../config';
import GoogleSTTService from './GoogleSTTService';

const logger = pino({ level: config.logLevel });

interface AudioStreamSession {
    userId: string;
    otherUserId: string;
    stream: any; // The GoogleSTTStream object returned by createStream
    lastActivity: number;
}

/**
 * STTService (formerly WhisperTranscriptionService)
 * 
 * Channels audio chunks directly to Google Cloud STT streaming for real-time, 
 * VAD-based transcription.
 */
class STTService {
    private sessions: Map<string, AudioStreamSession> = new Map();

    constructor() {
        logger.info('[STTService] Initialized — Using Real-time Streaming (VAD) backend');
    }

    /**
     * Add an audio chunk to the active stream for a specific call/user
     */
    addAudioChunk(callId: string, userId: string, otherUserId: string, audioDataBase64: string): void {
        const sessionKey = `${callId}_${userId}`;

        if (!this.sessions.has(sessionKey)) {
            logger.info({ callId, userId, sessionKey }, '[STTService] Creating new streaming session');
            
            // Create a new stream for this specific user in the call
            // The GoogleSTTService handles interim results and final transcription internally.
            const stream = GoogleSTTService.createStream(
                (transcript, isFinal) => {
                    // Interim results can be handled here if UI requires it.
                    if (isFinal) {
                        logger.info({ callId, userId, text: transcript }, '[STTService] Utterance finalized');
                    }
                },
                (error) => {
                    logger.error({ callId, userId, error: error.message }, '[STTService] Stream error');
                    this.terminateSession(sessionKey);
                },
                userId,
                otherUserId
            );

            this.sessions.set(sessionKey, {
                userId,
                otherUserId,
                stream,
                lastActivity: Date.now()
            });
        }

        const session = this.sessions.get(sessionKey)!;
        session.lastActivity = Date.now();

        // Debug: Log info about incoming chunk every ~50 chunks to avoid flooding
        if (Math.random() < 0.02) {
            const dataType = typeof audioDataBase64;
            const dataLength = dataType === 'string' ? audioDataBase64.length : (audioDataBase64 as any).length;
            logger.info({ sessionKey, dataType, dataLength }, '[STTService] Incoming audio chunk info');
        }

        // Pipe audio data directly to the stream
        try {
            session.stream.writeBlock(audioDataBase64);
        } catch (e: any) {
            logger.error({ error: e.message, sessionKey }, '[STTService] Failed to write audio to stream');
        }
    }

    /**
     * Terminate a specific session
     */
    private terminateSession(sessionKey: string): void {
        const session = this.sessions.get(sessionKey);
        if (session) {
            try {
                session.stream.close();
            } catch (e) {
                // Ignore close errors
            }
            this.sessions.delete(sessionKey);
            logger.info({ sessionKey }, '[STTService] Session closed and cleaned up');
        }
    }

    /**
     * Stop buffering for a call — close all active streams
     */
    async stopCall(callId: string): Promise<void> {
        const keysToRemove: string[] = [];

        for (const [key] of this.sessions) {
            if (key.startsWith(callId)) {
                keysToRemove.push(key);
            }
        }

        // Close and remove sessions
        for (const key of keysToRemove) {
            this.terminateSession(key);
        }
    }
}

export default new STTService();
