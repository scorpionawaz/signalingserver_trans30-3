"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiServerClient = exports.AIServerClient = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class AIServerClient {
    baseUrl;
    constructor() {
        this.baseUrl = config_1.config.aiServerUrl;
    }
    async classifyUrgency(transcript, callerId, targetUserId) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/api/classify-urgency`, {
                transcript,
                caller_id: callerId,
                target_user_id: targetUserId
            });
            logger.info({ urgency: response.data.urgency }, 'Urgency classified');
            return response.data;
        }
        catch (error) {
            logger.error({ error: error.message }, 'Error classifying urgency');
            // Default to HIGH for safety
            return {
                urgency: 'HIGH',
                confidence: 0.5,
                reasoning: 'Error during classification'
            };
        }
    }
    async logTranscript(callId, timestamp, speaker, text) {
        try {
            await axios_1.default.post(`${this.baseUrl}/api/log-transcript`, {
                call_id: callId,
                timestamp,
                speaker,
                text
            });
            logger.debug({ callId }, 'Transcript logged');
            return true;
        }
        catch (error) {
            logger.error({ error: error.message }, 'Error logging transcript');
            return false;
        }
    }
    async summarizeCall(callId) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}/api/summarize-call`, {
                call_id: callId
            });
            logger.info({ callId }, 'Call summarized');
            return response.data;
        }
        catch (error) {
            logger.error({ error: error.message }, 'Error summarizing call');
            return null;
        }
    }
}
exports.AIServerClient = AIServerClient;
exports.aiServerClient = new AIServerClient();
//# sourceMappingURL=aiServerClient.js.map