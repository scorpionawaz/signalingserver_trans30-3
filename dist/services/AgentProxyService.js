"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const ConversationService_1 = __importDefault(require("./ConversationService"));
class AgentProxyService {
    activeProxies = new Map();
    baseAgentUrl = null;
    setAgentServerUrl(url) {
        // Store base URL without query params
        this.baseAgentUrl = url;
        console.log('[AgentProxy] Base agent server URL set:', url);
    }
    async createProxy(clientSocket, callData) {
        if (!this.baseAgentUrl) {
            console.error('[AgentProxy] Agent server URL not configured');
            return;
        }
        // Build dynamic agent URL: empid = recipient (being called), calleremp = caller
        const agentUrl = `${this.baseAgentUrl}?empid=${callData.to}&calleremp=${callData.from}`;
        console.log(`[AgentProxy] Creating proxy to agent for call ${callData.callId}`);
        console.log(`[AgentProxy] Recipient: ${callData.to}, Caller: ${callData.from}`);
        console.log(`[AgentProxy] Agent URL: ${agentUrl}`);
        console.log(`[AgentProxy] EXACT RESOLVED URL: ${agentUrl}`);
        const agentWs = new ws_1.default(agentUrl);
        this.activeProxies.set(callData.callId, agentWs);
        agentWs.on('open', () => {
            console.log(`[AgentProxy] Connected to agent for call ${callData.callId}`);
        });
        agentWs.on('error', (error) => {
            console.error(`[AgentProxy] WebSocket error for call ${callData.callId}:`, error);
            clientSocket.emit('agent-error', {
                callId: callData.callId,
                message: 'Failed to connect to agent'
            });
        });
        // Mobile → Agent: Relay audio
        clientSocket.on('agent-audio', (data) => {
            if (data.callId !== callData.callId)
                return;
            if (agentWs.readyState === ws_1.default.OPEN) {
                agentWs.send(JSON.stringify({
                    type: 'audio',
                    data: data.audioData,
                }));
            }
        });
        // Mobile → Agent: Relay text
        clientSocket.on('agent-text', async (data) => {
            if (data.callId !== callData.callId)
                return;
            if (agentWs.readyState === ws_1.default.OPEN) {
                console.log(`[AgentProxy] Relaying text to agent: ${data.message}`);
                // Log user message to agent in database
                try {
                    await ConversationService_1.default.logMessage(callData.from, 'agent', data.message);
                    console.log(`[AgentProxy] User message logged to database`);
                }
                catch (error) {
                    console.error('[AgentProxy] Failed to log user message:', error);
                }
                agentWs.send(JSON.stringify({
                    type: 'text',
                    data: data.message,
                }));
            }
        });
        // Agent → Mobile: Relay responses
        agentWs.on('message', async (data) => {
            try {
                const msg = JSON.parse(data.toString());
                // DEBUG: Log ALL incoming message types from agent
                if (msg.type !== 'audio') { // efficient logging, skip audio chunks
                    console.log(`[AgentProxy] Received message type: ${msg.type}`);
                    console.log(`[AgentProxy] Payload:`, JSON.stringify(msg).substring(0, 200)); // Log first 200chars
                }
                if (msg.type === 'audio') {
                    clientSocket.emit('agent-audio-response', {
                        callId: callData.callId,
                        audioData: msg.data,
                    });
                }
                else if (msg.type === 'text') {
                    console.log(`[AgentProxy] Relaying agent text to mobile: ${msg.data}`);
                    // Log agent message to database
                    try {
                        await ConversationService_1.default.logMessage('agent', callData.from, msg.data);
                        console.log(`[AgentProxy] Agent message logged to database`);
                    }
                    catch (error) {
                        console.error('[AgentProxy] Failed to log agent message:', error);
                    }
                    clientSocket.emit('agent-text-response', {
                        callId: callData.callId,
                        message: msg.data,
                    });
                }
                else if (msg.type === 'interrupt' || msg.type === 'interrupted') {
                    console.log(`[AgentProxy] Relaying agent interrupt to mobile`);
                    clientSocket.emit('agent-interrupted', {
                        callId: callData.callId,
                    });
                }
            }
            catch (e) {
                console.error('[AgentProxy] Parse error:', e);
            }
        });
        // Cleanup
        const cleanup = () => {
            console.log(`[AgentProxy] Cleaning up proxy for call ${callData.callId}`);
            this.activeProxies.delete(callData.callId);
            if (agentWs.readyState === ws_1.default.OPEN) {
                agentWs.close();
            }
        };
        clientSocket.on('disconnect', cleanup);
        clientSocket.on('end-call', cleanup);
        agentWs.on('close', () => {
            console.log(`[AgentProxy] Agent WebSocket closed for call ${callData.callId}`);
            clientSocket.emit('agent-disconnected', { callId: callData.callId });
            cleanup();
        });
    }
    closeProxy(callId) {
        const agentWs = this.activeProxies.get(callId);
        if (agentWs) {
            console.log(`[AgentProxy] Manually closing proxy for call ${callId}`);
            agentWs.close();
            this.activeProxies.delete(callId);
        }
    }
    isProxyActive(callId) {
        return this.activeProxies.has(callId);
    }
}
exports.default = new AgentProxyService();
//# sourceMappingURL=AgentProxyService.js.map