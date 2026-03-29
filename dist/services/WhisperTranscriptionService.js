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
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const ConversationService_1 = __importDefault(require("./ConversationService"));
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class WhisperTranscriptionService {
    audioBuffers = new Map();
    tempDir;
    whisperBinaryPath;
    modelPath;
    flushIntervalMs = 7000; // Transcribe every 7 seconds
    minAudioBytes = 32000; // Minimum ~1 second of audio at 16kHz mono 16-bit
    constructor() {
        // Setup paths
        this.tempDir = path.join(process.cwd(), 'temp_audio');
        // nodejs-whisper paths
        const whisperBase = path.join(process.cwd(), 'node_modules', 'nodejs-whisper', 'cpp', 'whisper.cpp');
        this.whisperBinaryPath = path.join(whisperBase, 'build', 'bin', 'Release', 'whisper-cli.exe');
        this.modelPath = path.join(whisperBase, 'models', 'ggml-base.bin');
        // Create temp directory
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
        // Verify whisper binary and model exist
        if (!fs.existsSync(this.whisperBinaryPath)) {
            logger.error({ path: this.whisperBinaryPath }, '[Whisper] Binary not found!');
        }
        else if (!fs.existsSync(this.modelPath)) {
            logger.error({ path: this.modelPath }, '[Whisper] Model not found!');
        }
        else {
            logger.info('[Whisper] Service initialized — binary and model found');
        }
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
            logger.info({ callId, userId, bufferKey }, '[Whisper] New audio buffer created');
        }
        const buffer = this.audioBuffers.get(bufferKey);
        // Decode base64 to raw PCM buffer
        const pcmData = Buffer.from(audioDataBase64, 'base64');
        buffer.chunks.push(pcmData);
        buffer.totalBytes += pcmData.length;
    }
    /**
     * Flush buffered audio, write WAV, transcribe with Whisper, store result
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
        const totalBytes = buffer.totalBytes;
        buffer.totalBytes = 0;
        buffer.lastFlushTime = Date.now();
        // Combine all PCM chunks
        const pcmData = Buffer.concat(chunks);
        // Write WAV file
        const wavPath = path.join(this.tempDir, `${bufferKey}_${Date.now()}.wav`);
        try {
            this.writePcmToWav(pcmData, wavPath);
            logger.info({
                bufferKey,
                callId,
                pcmBytes: pcmData.length,
                durationSecs: (pcmData.length / (16000 * 2)).toFixed(1),
            }, '[Whisper] Transcribing audio chunk');
            // Run whisper transcription
            const transcript = this.runWhisper(wavPath);
            if (transcript && transcript.trim()) {
                logger.info({
                    callId,
                    userId: buffer.userId,
                    transcript: transcript.substring(0, 100),
                }, '[Whisper] Transcription result');
                // Store in MongoDB
                try {
                    await ConversationService_1.default.logCallTranscript(buffer.userId, buffer.otherUserId, `[call:${callId}] ${transcript.trim()}`, Date.now());
                    logger.info({ callId, userId: buffer.userId }, '[Whisper] Transcript persisted');
                }
                catch (dbError) {
                    logger.error({ error: dbError }, '[Whisper] Failed to persist transcript');
                }
            }
            else {
                logger.debug({ bufferKey }, '[Whisper] No speech detected in chunk');
            }
        }
        catch (error) {
            logger.error({ error, bufferKey }, '[Whisper] Transcription failed');
        }
        finally {
            // Cleanup temp WAV file
            try {
                if (fs.existsSync(wavPath)) {
                    fs.unlinkSync(wavPath);
                }
            }
            catch (cleanupErr) {
                logger.warn({ wavPath }, '[Whisper] Failed to cleanup temp file');
            }
        }
    }
    /**
     * Run whisper-cli.exe on a WAV file and return the transcript text
     */
    runWhisper(wavPath) {
        try {
            const cmd = `"${this.whisperBinaryPath}" -m "${this.modelPath}" -f "${wavPath}" --no-timestamps -l en --output-txt`;
            const output = (0, child_process_1.execSync)(cmd, {
                timeout: 30000, // 30 second timeout
                encoding: 'utf-8',
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            // whisper-cli outputs the transcript to stdout
            // Clean up: remove [BLANK_AUDIO] markers and extra whitespace
            const cleaned = output
                .replace(/\[BLANK_AUDIO\]/g, '')
                .replace(/\n+/g, ' ')
                .trim();
            return cleaned;
        }
        catch (error) {
            // Check if there's a .txt output file (whisper sometimes writes to file)
            const txtPath = wavPath.replace('.wav', '.txt');
            if (fs.existsSync(txtPath)) {
                const text = fs.readFileSync(txtPath, 'utf-8').trim();
                try {
                    fs.unlinkSync(txtPath);
                }
                catch { }
                return text;
            }
            logger.error({ error: error.message }, '[Whisper] CLI execution failed');
            return '';
        }
    }
    /**
     * Write raw PCM data as a WAV file (16kHz, mono, 16-bit LE)
     */
    writePcmToWav(pcmData, outputPath) {
        const sampleRate = 16000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
        const blockAlign = numChannels * (bitsPerSample / 8);
        const dataSize = pcmData.length;
        const headerSize = 44;
        const header = Buffer.alloc(headerSize);
        // RIFF header
        header.write('RIFF', 0);
        header.writeUInt32LE(dataSize + headerSize - 8, 4);
        header.write('WAVE', 8);
        // fmt sub-chunk
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16); // Sub-chunk size
        header.writeUInt16LE(1, 20); // Audio format (PCM)
        header.writeUInt16LE(numChannels, 22); // Channels
        header.writeUInt32LE(sampleRate, 24); // Sample rate
        header.writeUInt32LE(byteRate, 28); // Byte rate
        header.writeUInt16LE(blockAlign, 32); // Block align
        header.writeUInt16LE(bitsPerSample, 34); // Bits per sample
        // data sub-chunk
        header.write('data', 36);
        header.writeUInt32LE(dataSize, 40);
        // Write WAV file
        const fd = fs.openSync(outputPath, 'w');
        fs.writeSync(fd, header);
        fs.writeSync(fd, pcmData);
        fs.closeSync(fd);
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
            logger.info({ bufferKey: key }, '[Whisper] Buffer removed');
        }
    }
}
exports.default = new WhisperTranscriptionService();
//# sourceMappingURL=WhisperTranscriptionService.js.map