"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const ConversationService_1 = __importDefault(require("./ConversationService"));
const GoogleSTTService_1 = __importDefault(require("./GoogleSTTService"));
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
/**
 * STTService (formerly WhisperTranscriptionService)
 *
 * Buffers audio chunks and uses Google Cloud STT for persistent transcription.
 * Updated for Cloud Run compatibility by removing local Whisper dependencies.
 */
class STTService {
    audioBuffers = new Map();
    tempDir;
    flushIntervalMs = 7000; // Transcribe every 7 seconds
    minAudioBytes = 32000; // Minimum ~1 second of audio at 16kHz mono 16-bit
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
    addAudioChunk(callId, userId, otherUserId, audioDataBase64) {
        const bufferKey = `${callId}_${userId}`;
        if (!this.audioBuffers.has(bufferKey)) {
            // Create new buffer for this call/user
            const buffer = {
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
        const buffer = this.audioBuffers.get(bufferKey);
        // Decode base64 to raw PCM buffer
        try {
            const pcmData = Buffer.from(audioDataBase64, 'base64');
            buffer.chunks.push(pcmData);
            buffer.totalBytes += pcmData.length;
        }
        catch (e) {
            logger.error({ error: e.message }, '[STTService] Failed to decode audio chunk');
        }
    }
    /**
     * Flush buffered audio, transcribe with Google STT, store result
     */
    async flushAndTranscribe(bufferKey, callId) {
        const buffer = this.audioBuffers.get(bufferKey);
        if (!buffer || buffer.chunks.length === 0)
            return;
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
            const transcript = await GoogleSTTService_1.default.recognize(pcmData);
            if (transcript && transcript.trim()) {
                logger.info({
                    callId,
                    userId: buffer.userId,
                    transcriptPreview: transcript.substring(0, 50) + '...',
                }, '[STTService] Transcription successful');
                // Store in MongoDB
                try {
                    await ConversationService_1.default.logCallTranscript(buffer.userId, buffer.otherUserId, `[call:${callId}] ${transcript.trim()}`, Date.now());
                    logger.info({ callId, userId: buffer.userId }, '[STTService] Transcript persisted to DB');
                }
                catch (dbError) {
                    logger.error({ error: dbError.message }, '[STTService] Failed to persist transcript');
                }
            }
            else {
                logger.debug({ bufferKey }, '[STTService] No speech detected in chunk');
            }
        }
        catch (error) {
            logger.error({ error: error.message, bufferKey }, '[STTService] Transcription process failed');
        }
    }
    /**
     * Stop buffering for a call — flush remaining audio and cleanup
     */
    async stopCall(callId) {
        const keysToRemove = [];
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
exports.default = new STTService();
//# sourceMappingURL=WhisperTranscriptionService.js.map