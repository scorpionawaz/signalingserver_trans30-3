import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config';

const logger = pino({ level: config.logLevel });
const RECORDINGS_DIR = path.join(process.cwd(), 'recordings');

class AudioMixingService {
    /**
     * Mixes two PCM files from a call and uploads the result to the AI server.
     */
    async mixAndUpload(callId: string, emp1: string, emp2: string): Promise<void> {
        const file1 = path.join(RECORDINGS_DIR, `call_${callId}_${emp1}.pcm`);
        const file2 = path.join(RECORDINGS_DIR, `call_${callId}_${emp2}.pcm`);
        const outputFile = path.join(RECORDINGS_DIR, `call_${callId}_final.mp3`);

        logger.info({ callId, emp1, emp2 }, '[AudioMixing] Starting mix and upload process');

        try {
            // 1. Check if both files exist
            if (!fs.existsSync(file1) || !fs.existsSync(file2)) {
                logger.warn({ callId, file1Exists: fs.existsSync(file1), file2Exists: fs.existsSync(file2) },
                    '[AudioMixing] Missing PCM files, cannot produce mixed recording');
                return;
            }

            // 2. Run FFmpeg to mix two mono PCM streams into a stereo MP3
            // Settings: 16kHz, s16le, mono inputs -> Stereo MP3 output
            // [0:a][1:a]join=inputs=2:channel_layout=stereo[a]
            const ffmpegCmd = `ffmpeg -y \
                -f s16le -ar 16000 -ac 1 -i "${file1}" \
                -f s16le -ar 16000 -ac 1 -i "${file2}" \
                -filter_complex "[0:a][1:a]join=inputs=2:channel_layout=stereo[a]" \
                -map "[a]" "${outputFile}"`;

            logger.info({ ffmpegCmd }, '[AudioMixing] Executing FFmpeg mixing command');

            await new Promise<void>((resolve, reject) => {
                exec(ffmpegCmd, (error, stdout, stderr) => {
                    if (error) {
                        logger.error({ error: error.message, stderr }, '[AudioMixing] FFmpeg failed');
                        reject(error);
                        return;
                    }
                    logger.info('[AudioMixing] FFmpeg mixing completed successfully');
                    resolve();
                });
            });

            // 3. Upload the resulting MP3 to the AI server
            await this.uploadToAIServer(outputFile, emp1, emp2);

            // 4. Cleanup
            this.cleanupFiles([file1, file2, outputFile]);

        } catch (error: any) {
            logger.error({ error: error.message, callId }, '[AudioMixing] Process failed');
            // Attempt cleanup of output file if it exists
            if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
        }
    }

    private async uploadToAIServer(filePath: string, emp1: string, emp2: string): Promise<void> {
        const url = `${config.aiServerUrl}/process-audio-conversation`;
        logger.info({ url, filePath, emp1, emp2 }, '[AudioMixing] Uploading mixed audio to AI server');

        const form = new FormData();
        form.append('emp1', emp1);
        form.append('emp2', emp2);
        form.append('audio_file', fs.createReadStream(filePath));

        try {
            const response = await axios.post(url, form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            logger.info({ status: response.status, data: response.data }, '[AudioMixing] AI Server response received');
        } catch (error: any) {
            if (error.response) {
                logger.error({
                    status: error.response.status,
                    data: error.response.data
                }, '[AudioMixing] AI Server returned error response');
            } else {
                logger.error({ error: error.message }, '[AudioMixing] Failed to reach AI Server');
            }
            throw error;
        }
    }

    private cleanupFiles(files: string[]): void {
        files.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                    logger.debug({ file }, '[AudioMixing] Deleted temporary file');
                }
            } catch (err: any) {
                logger.warn({ file, error: err.message }, '[AudioMixing] Failed to delete temporary file');
            }
        });
    }
}

export const audioMixingService = new AudioMixingService();
export default audioMixingService;


