import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    aiServerUrl: 'https://agentserver-662251767689.asia-south1.run.app',
    logLevel: process.env.LOG_LEVEL || 'info',
    mongodbUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/call_gateway',
    agentServerUrl: process.env.AGENT_SERVER_URL || '',
};