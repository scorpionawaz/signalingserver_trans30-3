"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const socket_io_1 = require("socket.io");
const signalingServer_1 = require("./websocket/signalingServer");
const config_1 = require("./config");
const pino_1 = __importDefault(require("pino"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const PermissionService_1 = __importDefault(require("./services/PermissionService"));
const UserService_1 = __importDefault(require("./services/UserService"));
const AgentProxyService_1 = __importDefault(require("./services/AgentProxyService"));
const ConversationService_1 = __importDefault(require("./services/ConversationService"));
const UpdatesService_1 = __importDefault(require("./services/UpdatesService"));
const ws_1 = __importDefault(require("ws"));
const logger = (0, pino_1.default)({
    level: config_1.config.logLevel,
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true
        }
    }
});
// Start server
const startServer = async () => {
    const fastify = (0, fastify_1.default)({
        logger: logger
    });
    try {
        // Initialize Permission Service first
        console.log('[Server] Initializing PermissionService...');
        await PermissionService_1.default.init(config_1.config.mongodbUrl, 'talker');
        console.log('[Server] PermissionService initialized');
        // Get the database instance
        const db = PermissionService_1.default.db;
        // Initialize UserService with the same db instance
        UserService_1.default.init(db);
        console.log('[Server] UserService initialized');
        // Initialize ConversationService
        ConversationService_1.default.init(db);
        console.log('[Server] ConversationService initialized');
        // Initialize UpdatesService
        UpdatesService_1.default.init(db);
        console.log('[Server] UpdatesService initialized');
        // Initialize Agent Proxy Service with agent server URL
        AgentProxyService_1.default.setAgentServerUrl(config_1.config.agentServerUrl);
        console.log('[Server] AgentProxyService configured:', config_1.config.agentServerUrl);
        // Register plugins  
        await fastify.register(cors_1.default, {
            origin: '*'
        });
        // Register multipart for file uploads
        await fastify.register(multipart_1.default);
        // Serve static files manually  
        const path = require('path');
        const fs = require('fs');
        fastify.get('/', async (request, reply) => {
            const html = fs.readFileSync(path.join(__dirname, '../public/index.html'));
            reply.type('text/html').send(html);
        });
        fastify.get('/app.js', async (request, reply) => {
            const js = fs.readFileSync(path.join(__dirname, '../public/app.js'));
            reply.type('application/javascript').send(js);
        });
        fastify.get('/styles.css', async (request, reply) => {
            const css = fs.readFileSync(path.join(__dirname, '../public/styles.css'));
            reply.type('text/css').send(css);
        });
        // Test endpoint for permission checking
        fastify.get('/api/test-permission/:empid', async (request, reply) => {
            try {
                const { empid } = request.params;
                const permissions = await PermissionService_1.default.getUserPermissions(empid);
                return {
                    success: true,
                    empid,
                    permissions,
                    message: permissions.calls
                        ? 'Calls allowed - would route to P2P'
                        : 'Calls blocked - would route to agent'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Clear permission cache for specific user
        fastify.post('/api/clear-cache/:empid', async (request, reply) => {
            try {
                const { empid } = request.params;
                PermissionService_1.default.clearCache(empid);
                return {
                    success: true,
                    message: `Cache cleared for empid: ${empid}`
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Clear all permission cache
        fastify.post('/api/clear-cache', async (request, reply) => {
            try {
                PermissionService_1.default.clearAllCache();
                return {
                    success: true,
                    message: 'All cache cleared'
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Test endpoint for agent server connection
        fastify.get('/api/test-agent-connection', async (request, reply) => {
            const WebSocket = require('ws');
            const agentUrl = config_1.config.agentServerUrl;
            if (!agentUrl) {
                return { success: false, message: 'Agent URL not configured' };
            }
            return new Promise((resolve) => {
                console.log(`[Test] Connecting to agent: ${agentUrl}`);
                const ws = new WebSocket(agentUrl);
                const timeout = setTimeout(() => {
                    ws.terminate();
                    resolve({ success: false, message: 'Connection timed out (15s)' });
                }, 15000);
                ws.on('open', () => {
                    console.log('[AudioTest] Connected to agent server');
                    ws.send(JSON.stringify({
                        type: 'start',
                        callId: 'test-call-123',
                        sampleRate: 16000,
                        channels: 1
                    }));
                    setTimeout(() => {
                        const frame = Buffer.alloc(640);
                        const payload = frame.toString('base64');
                        const interval = setInterval(() => {
                            ws.send(JSON.stringify({
                                type: 'audio',
                                encoding: 'pcm16',
                                sampleRate: 16000,
                                channels: 1,
                                audio: payload
                            }));
                        }, 20);
                        setTimeout(() => clearInterval(interval), 1000);
                    }, 200);
                });
                ws.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ success: false, message: 'Connection failed', error: err.message });
                });
            });
        });
        // Health check
        fastify.get('/api/health', async () => {
            return {
                status: 'online',
                service: 'Call Gateway',
                version: '1.0.0'
            };
        });
        // Get active calls
        fastify.get('/api/calls', async () => {
            const { clientManager } = await Promise.resolve().then(() => __importStar(require('./websocket/clientManager')));
            return {
                activeCalls: clientManager.getAllSessions().length,
                sessions: clientManager.getAllSessions().map(s => ({
                    id: s.id,
                    status: s.status,
                    urgency: s.urgency,
                    routedTo: s.routedTo,
                    duration: s.endedAt ? s.endedAt - s.startedAt : Date.now() - s.startedAt
                }))
            };
        });
        // Get all registered users (for testing)
        fastify.get('/api/users', async () => {
            const { clientManager } = await Promise.resolve().then(() => __importStar(require('./websocket/clientManager')));
            const users = clientManager.getAllUsers();
            return {
                totalUsers: users.length,
                users: users
            };
        });
        // Get all users from database
        fastify.get('/api/db-users', async (request, reply) => {
            try {
                const users = await UserService_1.default.getAllUsers();
                return {
                    success: true,
                    totalUsers: users.length,
                    users: users
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Get conversation history by conversationId
        fastify.get('/api/conversations/:conversationId', async (request, reply) => {
            try {
                const { conversationId } = request.params;
                const conversation = await ConversationService_1.default.getConversation(conversationId);
                if (!conversation) {
                    reply.code(404);
                    return {
                        success: false,
                        error: 'Conversation not found'
                    };
                }
                return {
                    success: true,
                    conversation
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Get all conversations for a user
        fastify.get('/api/users/:userId/conversations', async (request, reply) => {
            try {
                const { userId } = request.params;
                const conversations = await ConversationService_1.default.getConversationsByUser(userId);
                return {
                    success: true,
                    totalConversations: conversations.length,
                    conversations
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Get messages between two users for mobile app sync
        fastify.get('/api/messages/:userId1/:userId2', async (request, reply) => {
            try {
                const { userId1, userId2 } = request.params;
                // Generate conversation ID (same logic as ConversationService)
                const conversationId = [userId1, userId2].sort().join('_');
                const conversation = await ConversationService_1.default.getConversation(conversationId);
                if (!conversation) {
                    return {
                        success: true,
                        messages: [],
                        conversationId
                    };
                }
                return {
                    success: true,
                    messages: conversation.messages,
                    conversationId: conversation.conversationId
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Get user permissions
        fastify.get('/api/permissions/:userId', async (request, reply) => {
            try {
                const { userId } = request.params;
                const permissions = await PermissionService_1.default.getUserPermissions(userId);
                return {
                    success: true,
                    permissions: {
                        calls: permissions.calls,
                        messages: permissions.messages
                    }
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Update user permissions
        fastify.put('/api/permissions/:userId', async (request, reply) => {
            try {
                const { userId } = request.params;
                const { calls, messages } = request.body;
                await PermissionService_1.default.updatePermissions(userId, { calls, messages });
                return {
                    success: true,
                    message: 'Permissions updated successfully'
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Update user profile details
        fastify.put('/api/users/:userId', async (request, reply) => {
            try {
                const { userId } = request.params;
                const userData = request.body;
                await UserService_1.default.updateUser(userId, userData);
                return {
                    success: true,
                    message: 'User updated successfully'
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Update user availability status
        fastify.put('/api/users/:userId/availability', async (request, reply) => {
            try {
                const { userId } = request.params;
                const { availability } = request.body;
                await UserService_1.default.updateAvailability(userId, availability);
                return {
                    success: true,
                    message: 'Availability updated successfully'
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Get project updates (General attributes from Nirmal Server AI)
        fastify.get('/api/project-updates', async (request, reply) => {
            try {
                const project = await db.collection('projects').findOne({ name: 'Nirmal Server AI' });
                if (!project || !project.general) {
                    return {
                        success: true,
                        updates: []
                    };
                }
                return {
                    success: true,
                    updates: project.general
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Get updates for a user
        fastify.get('/api/updates/:userId', async (request, reply) => {
            try {
                const { userId } = request.params;
                const { limit } = request.query;
                const updates = await UpdatesService_1.default.getUpdates(userId, limit ? parseInt(limit) : 50);
                const unreadCount = await UpdatesService_1.default.getUnreadCount(userId);
                return {
                    success: true,
                    updates,
                    unreadCount
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Mark updates as read
        fastify.post('/api/updates/:userId/mark-read', async (request, reply) => {
            try {
                const { userId } = request.params;
                const { updateIds } = request.body;
                await UpdatesService_1.default.markAsRead(userId, updateIds);
                return {
                    success: true,
                    message: 'Updates marked as read'
                };
            }
            catch (error) {
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        //test audio
        fastify.get('/api/test-agent-audio', async () => {
            const agentUrl = config_1.config.agentServerUrl || 'ws://10.188.163.10:8080/nirmal/?projectid=9900';
            return new Promise((resolve) => {
                const ws = new ws_1.default(agentUrl);
                const timeout = setTimeout(() => {
                    ws.terminate();
                    resolve({
                        success: false,
                        message: 'No response from agent'
                    });
                }, 5000);
                ws.on('open', () => {
                    console.log('[TEST] Connected');
                    // ✅ EXACT SAME AS REACT APP
                    ws.send(JSON.stringify({
                        type: 'text',
                        data: 'Hello agent from call-gateway'
                    }));
                });
                ws.on('message', (data) => {
                    clearTimeout(timeout);
                    resolve({
                        success: true,
                        response: data.toString()
                    });
                    ws.close();
                });
                ws.on('error', (err) => {
                    clearTimeout(timeout);
                    resolve({ success: false, error: err.message });
                });
            });
        });
        // Agent escalation endpoint - Agent server calls this to ring User B
        fastify.post('/api/escalate-call', async (request, reply) => {
            const { callId, recipientId, callerId, callerName } = request.body;
            logger.info({ callId, recipientId, callerId }, 'Agent server escalating call to user');
            // Import clientManager to get caller socket
            const { clientManager } = await Promise.resolve().then(() => __importStar(require('./websocket/clientManager')));
            // Step 1: Ring User B (recipientId)
            const { ringUser } = await Promise.resolve().then(() => __importStar(require('./websocket/signalingServer')));
            const ringResult = await ringUser(recipientId, callerId, callId, callerName);
            if (!ringResult.success) {
                reply.code(400);
                return {
                    success: false,
                    error: ringResult.reason
                };
            }
            // Step 2: Tell User A (callerId) to initiate WebRTC connection to User B
            const caller = clientManager.getUserFromDirectory(callerId);
            logger.info({ callerId, callerFound: !!caller, hasSocket: !!caller?.socket }, 'Looking up caller for P2P initiation');
            if (caller && caller.socket) {
                logger.info({ callerId, recipientId, callId }, 'Sending agent-transfer-to-human event to caller');
                caller.socket.emit('agent-transfer-to-human', {
                    callId: callId,
                    recipientId: recipientId,
                    recipientName: clientManager.getUserFromDirectory(recipientId)?.displayName || 'User'
                });
                logger.info({ callerId, recipientId, callId }, 'Notified caller to initiate P2P connection');
            }
            else {
                // DEBUG: Log why we couldn't find the caller
                const allUsers = clientManager.getAllUsers();
                logger.error({
                    callerId,
                    callerFound: !!caller,
                    hasSocket: !!caller?.socket,
                    totalUsers: allUsers.length,
                    availableUserIds: allUsers.map(u => u.id)
                }, 'Caller not found or offline - cannot initiate P2P');
            }
            return {
                success: true,
            };
        });
        // Agent escalation endpoint for WEB client - Rings User B's web client specifically
        fastify.post('/api/escalate-call-web', async (request, reply) => {
            const { callId, recipientId, callerId, callerName } = request.body;
            logger.info({ callId, recipientId, callerId }, 'Agent server escalating call to WEB user');
            // Import clientManager to get caller socket
            const { clientManager } = await Promise.resolve().then(() => __importStar(require('./websocket/clientManager')));
            // Step 1: Ring User B (recipientId) - TARGETING WEB CLIENT
            const { ringWebUser } = await Promise.resolve().then(() => __importStar(require('./websocket/signalingServer')));
            const ringResult = await ringWebUser(recipientId, callerId, callId, callerName);
            if (!ringResult.success) {
                logger.warn({ callId, recipientId, reason: ringResult.reason }, 'Failed to ring web user');
                reply.code(400);
                return {
                    success: false,
                    error: ringResult.reason
                };
            }
            // Step 2: Tell User A (callerId) to initiate WebRTC connection to User B
            const caller = clientManager.getUserFromDirectory(callerId);
            logger.info({ callerId, callerFound: !!caller, hasSocket: !!caller?.socket }, 'Looking up caller for P2P initiation');
            if (caller && caller.socket) {
                logger.info({ callerId, recipientId, callId }, 'Triggering initiateWebCall logic for caller');
                // Invoke the exact logic used by 'call-user-web'
                const { initiateWebCall } = await Promise.resolve().then(() => __importStar(require('./websocket/signalingServer')));
                await initiateWebCall(caller.socket, {
                    to: recipientId,
                    from: callerId,
                    callId: callId,
                    callerName: callerName // Pass the agent's name
                });
                logger.info({ callerId, recipientId, callId }, 'initiateWebCall executed successfully');
            }
            else {
                logger.warn({ callerId, callerExists: !!caller, hasSocket: !!caller?.socket }, 'Caller not found or offline - cannot initiate P2P');
            }
            return {
                success: true,
            };
        });
        // Conversation transcript endpoint - receives transcripts from mobile app
        fastify.post('/api/conversation-transcript', async (request, reply) => {
            const { callId, userId, userName, otherUserId, transcript, timestamp, isFinal } = request.body;
            logger.info({
                callId,
                userId,
                userName,
                otherUserId,
                transcriptLength: transcript.length,
                isFinal,
                timestamp
            }, 'Received conversation transcript');
            // Log the actual transcript for debugging
            console.log('='.repeat(60));
            console.log(`[TRANSCRIPT] ${userName} (${userId})`);
            console.log(`[CALL ID] ${callId}`);
            console.log(`[OTHER USER] ${otherUserId}`);
            console.log(`[STATUS] ${isFinal ? 'FINAL' : 'PARTIAL'}`);
            console.log(`[TEXT] ${transcript}`);
            console.log('='.repeat(60));
            // Persist final transcripts to conversation history
            if (isFinal && transcript.trim()) {
                try {
                    await ConversationService_1.default.logMessage(userId, otherUserId, `[call:${callId}] ${transcript}`, timestamp);
                    logger.info({ callId, userId, otherUserId }, 'Transcript persisted to conversation');
                }
                catch (error) {
                    logger.error({ error }, 'Failed to persist transcript');
                }
            }
            return {
                success: true,
                message: 'Transcript received'
            };
        });
        // Send message notification (FCM only, no sockets)
        fastify.post('/api/notify/message', async (request, reply) => {
            try {
                const { recipientId, senderId, senderName, messageText, messageId } = request.body;
                if (!recipientId || !senderId || !messageText || !messageId) {
                    reply.code(400);
                    return {
                        success: false,
                        error: 'Missing required fields'
                    };
                }
                // Get recipient from client directory
                const { clientManager } = await Promise.resolve().then(() => __importStar(require('./websocket/clientManager')));
                const recipient = clientManager.getUserFromDirectory(recipientId);
                if (!recipient || !recipient.fcmToken) {
                    reply.code(404);
                    return {
                        success: false,
                        error: 'Recipient not found or has no FCM token'
                    };
                }
                // Send FCM message notification
                const { sendMessageNotification } = await Promise.resolve().then(() => __importStar(require('./services/firebaseService')));
                await sendMessageNotification(recipient.fcmToken, senderId, senderName, messageText, messageId);
                return {
                    success: true,
                    message: 'Message notification sent'
                };
            }
            catch (error) {
                request.log.error({ error }, 'Failed to send message notification');
                reply.code(500);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
        // Whisper audio transcription endpoint
        // fastify.post('/api/transcribe-audio', async (request, reply) => {
        //     try {
        //         const data = await request.file();
        //         if (!data) {
        //             reply.code(400);
        //             return { error: 'No audio file provided' };
        //         }
        //         const callId = (data.fields.callId as any)?.value || 'unknown';
        //         const userId = (data.fields.userId as any)?.value || 'unknown';
        //         logger.info({ callId, userId }, 'Received audio for transcription');
        //         // Save uploaded file temporarily
        //         const tempPath = `./temp_${Date.now()}.m4a`;
        //         const fs = require('fs');
        //         const writeStream = fs.createWriteStream(tempPath);
        //         data.file.pipe(writeStream);
        //         await new Promise((resolve, reject) => {
        //             writeStream.on('finish', resolve);
        //             writeStream.on('error', reject);
        //         });
        //         try {
        //             // Transcribe using Whisper
        //             const result = await transcribeAudio(tempPath);
        //             logger.info({
        //                 callId,
        //                 userId,
        //                 transcriptLength: result.text.length,
        //                 language: result.language
        //             }, 'Audio transcribed successfully');
        //             // Log the transcript
        //             console.log('='.repeat(60));
        //             console.log(`[WHISPER TRANSCRIPT] User: ${userId}`);
        //             console.log(`[CALL ID] ${callId}`);
        //             console.log(`[LANGUAGE] ${result.language}`);
        //             console.log(`[TEXT] ${result.text}`);
        //             console.log('='.repeat(60));
        //             // TODO: Forward to AI server
        //             // await aiServerClient.sendConversationTranscript({
        //             //     callId, userId, transcript: result.text, language: result.language
        //             // });
        //             // Clean up temp file
        //             fs.unlinkSync(tempPath);
        //             return {
        //                 success: true,
        //                 text: result.text,
        //                 language: result.language
        //             };
        //         } catch (error: any) {
        //             // Clean up temp file on error
        //             if (fs.existsSync(tempPath)) {
        //                 fs.unlinkSync(tempPath);
        //             }
        //             logger.error({ error: error.message }, 'Whisper transcription failed');
        //             reply.code(500);
        //             return { error: 'Transcription failed', details: error.message };
        //         }
        //     } catch (error: any) {
        //         logger.error({ error: error.message }, 'Failed to process audio upload');
        //         reply.code(500);
        //         return { error: 'Failed to process audio upload' };
        //     }
        // })
        // await fastify.listen({ port: config.port, host: '0.0.0.0' });
        const { WebSocketServer } = require('ws');
        const sttWss = new WebSocketServer({ noServer: true });
        sttWss.on('connection', (socket) => {
            const GoogleSTTService = require('./services/GoogleSTTService').default;
            let sttStream = null;
            socket.on('message', (message) => {
                try {
                    const msg = JSON.parse(message.toString());
                    if (msg.type === 'start') {
                        console.log('[STT Proxy Native] Starting new stream session');
                        if (sttStream)
                            sttStream.close();
                        sttStream = GoogleSTTService.createStream((transcript, isFinal) => {
                            socket.send(JSON.stringify({ type: 'transcript', isFinal, text: transcript }));
                        }, (error) => {
                            socket.send(JSON.stringify({ type: 'error', message: error.message }));
                        });
                    }
                    else if (msg.type === 'audio' && sttStream) {
                        sttStream.writeBlock(msg.data);
                    }
                    else if (msg.type === 'stop' && sttStream) {
                        console.log('[STT Proxy Native] Stopping stream session manually');
                        sttStream.close();
                        sttStream = null;
                    }
                }
                catch (e) {
                    console.error('[STT Proxy Native] Error processing message', e);
                }
            });
            socket.on('close', () => {
                if (sttStream) {
                    console.log('[STT Proxy Native] Connection closed, cleaning up stream');
                    sttStream.close();
                }
            });
        });
        // Intercept upgrade requests manually
        fastify.server.on('upgrade', (request, socket, head) => {
            if (request.url === '/api/stt-stream') {
                sttWss.handleUpgrade(request, socket, head, (ws) => {
                    sttWss.emit('connection', ws, request);
                });
            }
            // All other upgrade requests (like /socket.io/) will be naturally ignored here
            // and handled by Socket.IO below.
        });
        // Setup Socket.IO server
        const io = new socket_io_1.Server(fastify.server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST']
            },
            transports: ['websocket', 'polling']
        });
        (0, signalingServer_1.setupSocketIOServer)(io);
        // logger.info(`Call Gateway running on port ${config.port}`);
        // logger.info(`Socket.IO endpoint: http://localhost:${config.port}`);
        // logger.info(`Web client: http://localhost:${config.port}`);
        return fastify;
    }
    catch (err) {
        logger.error(err);
        process.exit(1);
    }
};
(async () => {
    const app = await startServer();
    module.exports = app;
})();
// Graceful Shutdown for Cloud Run
const signalHandler = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    // Perform cleanup here (e.g., close DB connections, socket disconnects)
    try {
        // If you have explicit close methods in your services, call them here
        // e.g., await PermissionService.close();
        logger.info('Cleanup complete. Exiting.');
        process.exit(0);
    }
    catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
    }
};
process.on('SIGTERM', () => signalHandler('SIGTERM'));
process.on('SIGINT', () => signalHandler('SIGINT'));
//# sourceMappingURL=server.js.map