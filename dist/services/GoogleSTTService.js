"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSTTService = void 0;
const speech_1 = require("@google-cloud/speech");
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class GoogleSTTService {
    client;
    constructor() {
        this.client = new speech_1.v1.SpeechClient();
        logger.info('[GoogleSTT] Initialized Google Cloud Speech Client');
    }
    /**
     * Creates a streaming recognize session.
     * @param onTranscript Callback when a final/interim transcript is received
     * @param onError Callback when an error occurs
     */
    createStream(onTranscript, onError) {
        const recognizeStream = this.client
            .streamingRecognize({
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: 16000,
                languageCode: 'en-US',
            },
            interimResults: true, // we want interim results so we know it's working
        })
            .on('error', (err) => {
            logger.error({ error: err }, '[GoogleSTT] Stream Error');
            onError(err);
        })
            .on('data', (data) => {
            const result = data.results[0];
            if (result && result.alternatives[0]) {
                const transcript = result.alternatives[0].transcript;
                const isFinal = result.isFinal;
                if (isFinal) {
                    logger.info({ transcript }, '[GoogleSTT] Final transcript');
                }
                onTranscript(transcript, isFinal);
            }
        });
        return {
            /**
             * Writes a base64 encoded audio chunk to the stream
             */
            writeBlock: (base64Data) => {
                try {
                    const audioBuffer = Buffer.from(base64Data, 'base64');
                    recognizeStream.write(audioBuffer);
                }
                catch (e) {
                    logger.error({ error: e.message }, '[GoogleSTT] Error writing block to stream');
                }
            },
            /**
             * Closes the stream gracefully
             */
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