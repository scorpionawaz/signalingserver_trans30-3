"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    aiServerUrl: process.env.AI_SERVER_URL || 'http://localhost:8000',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    logLevel: process.env.LOG_LEVEL || 'info',
    mongodbUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/call_gateway',
    agentServerUrl: process.env.AGENT_SERVER_URL || '',
};
//# sourceMappingURL=index.js.map