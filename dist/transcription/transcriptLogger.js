"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transcriptLogger = exports.TranscriptLogger = void 0;
const aiServerClient_1 = require("../services/aiServerClient");
const urgencyDetector_1 = require("../routing/urgencyDetector");
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class TranscriptLogger {
    async logTranscript(callSession, speaker, text) {
        const timestamp = Date.now();
        // Log to AI server
        await aiServerClient_1.aiServerClient.logTranscript(callSession.id, timestamp, speaker, text);
        // If still in detection phase, add to buffer
        if (callSession.status === 'detecting_urgency') {
            urgencyDetector_1.urgencyDetector.addTranscriptChunk(callSession.id, text);
        }
        logger.debug({ callId: callSession.id, speaker, textLength: text.length }, 'Transcript logged');
    }
    async startContinuousLogging(callSession) {
        logger.info({ callId: callSession.id }, 'Started continuous transcript logging');
        // In production, this would set up STT streaming
        // For now, this is a placeholder
    }
}
exports.TranscriptLogger = TranscriptLogger;
exports.transcriptLogger = new TranscriptLogger();
//# sourceMappingURL=transcriptLogger.js.map