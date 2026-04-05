"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSTTService = void 0;
const speech_1 = require("@google-cloud/speech");
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const ConversationService_1 = __importDefault(require("./ConversationService"));
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class GoogleSTTService {
    client;
    constructor() {
        this.client = new speech_1.v1.SpeechClient();
        logger.info('[GoogleSTT] Initialized Google Cloud Speech Client');
    }
    /**
     * One-off (batch) transcription for an audio buffer.
     * Useful for replacement of Whisper 7-second chunking logic.
     */
    async recognize(audioBuffer) {
        try {
            const [response] = await this.client.recognize({
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'en-IN',
                    alternativeLanguageCodes: ['hi-IN'],
                },
                audio: {
                    content: audioBuffer,
                },
            });
            const transcription = response.results
                ?.map(result => result.alternatives?.[0]?.transcript)
                .join('\n');
            return transcription || '';
        }
        catch (error) {
            logger.error({ error: error.message }, '[GoogleSTT] Batch recognition failed');
            return '';
        }
    }
    /**
     * Creates a streaming recognize session.
     * @param onTranscript Callback when a final/interim transcript is received
     * @param onError Callback when an error occurs
     * @param userId Optional user ID for DB persistence
     * @param otherUserId Optional recipient user ID for DB persistence
     */
    createStream(onTranscript, onError, userId, otherUserId) {
        const recognizeStream = this.client
            .streamingRecognize({
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-IN',
                alternativeLanguageCodes: ['hi-IN'],
                speechContexts: [{
                        phrases: ["Nimi", "Nirmal", "Nawaz", "Manya", "Shruti", "Shriniwas"],
                        boost: 20.0
                    }],
            },
            interimResults: true,
        })
            .on('error', (err) => {
            logger.error({ error: err }, '[GoogleSTT] Stream Error');
            onError(err);
        })
            .on('data', async (data) => {
            const result = data.results[0];
            if (result && result.alternatives[0]) {
                const transcript = result.alternatives[0].transcript;
                const isFinal = result.isFinal;
                if (isFinal) {
                    logger.info({ transcript, userId, otherUserId }, '[GoogleSTT] Final transcript received');
                    // Persist to DB if user IDs are provided
                    if (userId && otherUserId && transcript.trim()) {
                        try {
                            await ConversationService_1.default.logCallTranscript(userId, otherUserId, transcript.trim(), Date.now());
                            logger.info('[GoogleSTT] Transcript persisted to MongoDB');
                        }
                        catch (dbErr) {
                            logger.error({ error: dbErr.message }, '[GoogleSTT] Failed to persist transcript');
                        }
                    }
                }
                onTranscript(transcript, isFinal);
            }
        });
        return {
            writeBlock: (data) => {
                try {
                    const audioBuffer = Buffer.isBuffer(data)
                        ? data
                        : Buffer.from(data, 'base64');
                    recognizeStream.write(audioBuffer);
                }
                catch (e) {
                    logger.error({ error: e.message }, '[GoogleSTT] Error writing block to stream');
                }
            },
            close: () => {
                logger.info('[GoogleSTT] Closing stream');
                recognizeStream.end();
            }
        };
    }
}
exports.GoogleSTTService = GoogleSTTService;
exports.default = new GoogleSTTService();
//# sourceMappingURL=GoogleSTTService.js.map