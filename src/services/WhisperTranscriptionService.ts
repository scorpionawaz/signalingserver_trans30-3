import * as fs from 'fs';
import * as path from 'path';
import pino from 'pino';
import { config } from '../config';
import ConversationService from './ConversationService';
import GoogleSTTService from './GoogleSTTService';

const logger = pino({ level: config.logLevel });

interface AudioBuffer {
    userId: string;
    otherUserId: string;
    chunks: Buffer[];
    timer: NodeJS.Timeout | null;
    totalBytes: number;
    lastFlushTime: number;
}

/**
 * STTService (formerly WhisperTranscriptionService)
 * 
 * Buffers audio chunks and uses Google Cloud STT for persistent transcription.
 * Updated for Cloud Run compatibility by removing local Whisper dependencies.
 */
class STTService {
    private audioBuffers: Map<string, AudioBuffer> = new Map();
    private tempDir: string;
    private flushIntervalMs: number = 7000; // Transcribe every 7 seconds
    private minAudioBytes: number = 32000; // Minimum ~1 second of audio at 16kHz mono 16-bit

    constructor() {
        this.tempDir = path.join(process.cwd(), 'temp_audio');

        // Create temp directory
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }

        logger.info('[STTService] Initialized — Using Google Cloud STT backend');
    }

    /**
     * Add an audio chunk to the buffer for a specific call/user
     */
    addAudioChunk(callId: string, userId: string, otherUserId: string, audioDataBase64: string): void {
        const bufferKey = `${callId}_${userId}`;

        if (!this.audioBuffers.has(bufferKey)) {
            // Create new buffer for this call/user
            const buffer: AudioBuffer = {
                userId,
                otherUserId,
                chunks: [],
                timer: null,
                totalBytes: 0,
                lastFlushTime: Date.now(),
            };

            // Start periodic flush timer
            buffer.timer = setInterval(() => {
                this.flushAndTranscribe(bufferKey, callId);
            }, this.flushIntervalMs);

            this.audioBuffers.set(bufferKey, buffer);
            logger.info({ callId, userId, bufferKey }, '[STTService] New audio buffer created');
        }

        const buffer = this.audioBuffers.get(bufferKey)!;

        // Decode base64 to raw PCM buffer
        try {
            const pcmData = Buffer.from(audioDataBase64, 'base64');
            buffer.chunks.push(pcmData);
            buffer.totalBytes += pcmData.length;
        } catch (e: any) {
            logger.error({ error: e.message }, '[STTService] Failed to decode audio chunk');
        }
    }

    /**
     * Flush buffered audio, transcribe with Google STT, store result
     */
    private async flushAndTranscribe(bufferKey: string, callId: string): Promise<void> {
        const buffer = this.audioBuffers.get(bufferKey);
        if (!buffer || buffer.chunks.length === 0) return;

        // Check minimum audio length
        if (buffer.totalBytes < this.minAudioBytes) {
            return; // Not enough audio yet
        }

        // Take all chunks and reset buffer
        const chunks = buffer.chunks.splice(0);
        buffer.totalBytes = 0;
        buffer.lastFlushTime = Date.now();

        // Combine all PCM chunks
        const pcmData = Buffer.concat(chunks);

        try {
            logger.info({
                bufferKey,
                callId,
                pcmBytes: pcmData.length,
                durationSecs: (pcmData.length / (16000 * 2)).toFixed(1),
            }, '[STTService] Transcribing audio chunk with Google STT');

            // Transcribe using Google STT (Batch mode)
            const transcript = await GoogleSTTService.recognize(pcmData);

            if (transcript && transcript.trim()) {
                logger.info({
                    callId,
                    userId: buffer.userId,
                    transcriptPreview: transcript.substring(0, 50) + '...',
                }, '[STTService] Transcription successful');

                // Store in MongoDB
                try {
                    await ConversationService.logCallTranscript(
                        buffer.userId,
                        buffer.otherUserId,
                        `[call:${callId}] ${transcript.trim()}`,
                        Date.now()
                    );
                    logger.info({ callId, userId: buffer.userId }, '[STTService] Transcript persisted to DB');
                } catch (dbError: any) {
                    logger.error({ error: dbError.message }, '[STTService] Failed to persist transcript');
                }
            } else {
                logger.debug({ bufferKey }, '[STTService] No speech detected in chunk');
            }
        } catch (error: any) {
            logger.error({ error: error.message, bufferKey }, '[STTService] Transcription process failed');
        }
    }

    /**
     * Stop buffering for a call — flush remaining audio and cleanup
     */
    async stopCall(callId: string): Promise<void> {
        const keysToRemove: string[] = [];

        for (const [key, buffer] of this.audioBuffers) {
            if (key.startsWith(callId)) {
                // Clear timer
                if (buffer.timer) {
                    clearInterval(buffer.timer);
                    buffer.timer = null;
                }

                // Final flush
                await this.flushAndTranscribe(key, callId);

                keysToRemove.push(key);
            }
        }

        // Remove buffers
        for (const key of keysToRemove) {
            this.audioBuffers.delete(key);
            logger.info({ bufferKey: key }, '[STTService] Buffer cleaned up');
        }
    }
}

export default new STTService();
