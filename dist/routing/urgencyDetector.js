"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.urgencyDetector = exports.UrgencyDetector = void 0;
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class UrgencyDetector {
    detectionBuffer = new Map();
    DETECTION_TIME_MS = 10000; // 10 seconds
    MIN_WORDS = 10;
    async startDetection(callSession) {
        logger.info({ callId: callSession.id }, 'Starting urgency detection');
        // Initialize buffer
        this.detectionBuffer.set(callSession.id, []);
        // Set timeout for detection
        setTimeout(() => {
            this.performDetection(callSession.id);
        }, this.DETECTION_TIME_MS);
    }
    addTranscriptChunk(callId, text) {
        const buffer = this.detectionBuffer.get(callId);
        if (buffer) {
            buffer.push(text);
            this.detectionBuffer.set(callId, buffer);
        }
    }
    async performDetection(callId) {
        const buffer = this.detectionBuffer.get(callId);
        if (!buffer || buffer.length === 0) {
            logger.warn({ callId }, 'No transcript for urgency detection, defaulting to HIGH');
            // Default to HIGH for safety
            return;
        }
        const transcript = buffer.join(' ');
        const wordCount = transcript.split(' ').length;
        // If not enough words, default to HIGH for safety
        if (wordCount < this.MIN_WORDS) {
            logger.warn({ callId, wordCount }, 'Insufficient transcript, defaulting to HIGH');
            return;
        }
        logger.debug({ callId, transcript: transcript.substring(0, 50) }, 'Detecting urgency');
        // Detection will be triggered by call router
        // This just manages the buffer
    }
    getInitialTranscript(callId) {
        const buffer = this.detectionBuffer.get(callId);
        return buffer ? buffer.join(' ') : '';
    }
    clearBuffer(callId) {
        this.detectionBuffer.delete(callId);
    }
}
exports.UrgencyDetector = UrgencyDetector;
exports.urgencyDetector = new UrgencyDetector();
//# sourceMappingURL=urgencyDetector.js.map