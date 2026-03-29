"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callRouter = exports.CallRouter = void 0;
const clientManager_1 = require("../websocket/clientManager");
const aiServerClient_1 = require("../services/aiServerClient");
const urgencyDetector_1 = require("./urgencyDetector");
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class CallRouter {
    async routeCall(callSession) {
        logger.info({ callId: callSession.id }, 'Routing call');
        try {
            // Get initial transcript from buffer
            const initialTranscript = urgencyDetector_1.urgencyDetector.getInitialTranscript(callSession.id);
            // Classify urgency
            const urgencyResult = await aiServerClient_1.aiServerClient.classifyUrgency(initialTranscript, callSession.callerId, callSession.targetUserId);
            // Update session
            callSession.urgency = urgencyResult.urgency;
            callSession.initialTranscript = initialTranscript;
            logger.info({ callId: callSession.id, urgency: urgencyResult.urgency }, 'Urgency detected');
            // Route based on urgency
            if (urgencyResult.urgency === 'HIGH') {
                await this.bridgeToHuman(callSession);
            }
            else {
                await this.bridgeToBot(callSession);
            }
            // Notify caller of routing
            if (callSession.callerSocket) {
                callSession.callerSocket.send(JSON.stringify({
                    type: 'urgency-detected',
                    payload: {
                        callId: callSession.id,
                        urgency: urgencyResult.urgency,
                        routedTo: callSession.routedTo
                    }
                }));
            }
            // Clear detection buffer
            urgencyDetector_1.urgencyDetector.clearBuffer(callSession.id);
        }
        catch (error) {
            logger.error({ error: error.message, callId: callSession.id }, 'Error routing call');
            // Default to human for safety
            await this.bridgeToHuman(callSession);
        }
    }
    async bridgeToHuman(callSession) {
        logger.info({ callId: callSession.id }, 'Routing to HUMAN');
        callSession.routedTo = 'HUMAN';
        callSession.status = 'connected';
        clientManager_1.clientManager.updateCallSession(callSession.id, callSession);
        // Find target user's socket
        const targetSocket = clientManager_1.clientManager.getClient(callSession.targetUserId);
        if (targetSocket) {
            // Notify target user of incoming call
            targetSocket.send(JSON.stringify({
                type: 'incoming-call',
                payload: {
                    callId: callSession.id,
                    callerId: callSession.callerId,
                    urgency: callSession.urgency
                }
            }));
            callSession.recipientSocket = targetSocket;
        }
        else {
            logger.warn({ userId: callSession.targetUserId }, 'Target user not connected');
            // Notify caller that user is unavailable
            if (callSession.callerSocket) {
                callSession.callerSocket.send(JSON.stringify({
                    type: 'call-failed',
                    payload: {
                        callId: callSession.id,
                        reason: 'User unavailable'
                    }
                }));
            }
        }
    }
    async bridgeToBot(callSession) {
        logger.info({ callId: callSession.id }, 'Routing to BOT');
        callSession.routedTo = 'BOT';
        callSession.status = 'connected';
        clientManager_1.clientManager.updateCallSession(callSession.id, callSession);
        // In production, this would connect to the personal bot service
        // For now, send notification
        if (callSession.callerSocket) {
            callSession.callerSocket.send(JSON.stringify({
                type: 'connected-to-bot',
                payload: {
                    callId: callSession.id,
                    botName: 'Personal Assistant'
                }
            }));
        }
        // TODO: Actually connect to bot WebRTC client
        logger.warn({ callId: callSession.id }, 'Bot connection not yet implemented');
    }
}
exports.CallRouter = CallRouter;
exports.callRouter = new CallRouter();
//# sourceMappingURL=callRouter.js.map