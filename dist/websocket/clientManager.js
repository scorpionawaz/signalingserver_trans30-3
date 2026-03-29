"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientManager = exports.ClientManager = void 0;
const pino_1 = __importDefault(require("pino"));
const config_1 = require("../config");
const logger = (0, pino_1.default)({ level: config_1.config.logLevel });
class ClientManager {
    clients = new Map();
    callSessions = new Map();
    // Mobile user registry for FCM tokens
    mobileUsers = new Map();
    // Web user registry
    webUsers = new Map();
    // Persistent user directory - keeps users even when offline
    userDirectory = new Map();
    addClient(userId, socket) {
        this.clients.set(userId, socket);
        logger.info({ userId }, 'Client connected');
    }
    // Mobile user management
    addMobileUser(userId, displayName, socket, fcmToken) {
        this.mobileUsers.set(userId, {
            socketId: socket.id || userId,
            displayName,
            fcmToken,
            socket
        });
        // Also add to persistent directory and mark as online
        this.userDirectory.set(userId, {
            displayName,
            fcmToken,
            isOnline: true
        });
        logger.info({ userId, displayName, hasFcmToken: !!fcmToken }, 'Mobile user registered');
    }
    addWebUser(userId, displayName, socket) {
        this.webUsers.set(userId, {
            socketId: socket.id || userId,
            displayName,
            socket
        });
        logger.info({
            userId,
            displayName,
            socketId: socket.id,
            totalWebUsers: this.webUsers.size
        }, 'Web user registered - Socket stored');
    }
    getMobileUser(userId) {
        return this.mobileUsers.get(userId);
    }
    getWebUser(userId) {
        return this.webUsers.get(userId);
    }
    removeMobileUser(userId) {
        this.mobileUsers.delete(userId);
        // Mark as offline in directory but keep the record
        const user = this.userDirectory.get(userId);
        if (user) {
            user.isOnline = false;
        }
        logger.info({ userId }, 'Mobile user disconnected');
    }
    removeWebUser(userId) {
        this.webUsers.delete(userId);
        logger.info({ userId }, 'Web user disconnected');
    }
    getAllMobileUsers() {
        return Array.from(this.mobileUsers.entries()).map(([userId, user]) => ({
            id: userId,
            name: user.displayName
        }));
    }
    // Get all users including offline ones
    getAllUsers() {
        return Array.from(this.userDirectory.entries()).map(([userId, user]) => ({
            id: userId,
            name: user.displayName,
            isOnline: user.isOnline
        }));
    }
    // Get user from directory (works for both online and offline)
    getUserFromDirectory(userId) {
        const dirUser = this.userDirectory.get(userId);
        if (!dirUser)
            return null;
        const mobileUser = this.mobileUsers.get(userId);
        return {
            displayName: dirUser.displayName,
            fcmToken: dirUser.fcmToken,
            isOnline: dirUser.isOnline,
            socket: mobileUser?.socket || null
        };
    }
    removeClient(userId) {
        this.clients.delete(userId);
        logger.info({ userId }, 'Client disconnected');
    }
    getClient(userId) {
        return this.clients.get(userId);
    }
    createCallSession(session) {
        this.callSessions.set(session.id, session);
        logger.info({ callId: session.id }, 'Call session created');
    }
    getCallSession(callId) {
        return this.callSessions.get(callId);
    }
    updateCallSession(callId, updates) {
        const session = this.callSessions.get(callId);
        if (session) {
            Object.assign(session, updates);
            this.callSessions.set(callId, session);
        }
    }
    endCallSession(callId) {
        const session = this.callSessions.get(callId);
        if (session) {
            session.status = 'ended';
            session.endedAt = Date.now();
            this.callSessions.set(callId, session);
            logger.info({ callId }, 'Call session ended');
        }
    }
    getAllSessions() {
        return Array.from(this.callSessions.values());
    }
    getAllClients() {
        return Array.from(this.clients.keys());
    }
}
exports.ClientManager = ClientManager;
exports.clientManager = new ClientManager();
//# sourceMappingURL=clientManager.js.map