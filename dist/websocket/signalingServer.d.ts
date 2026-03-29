import { Server as SocketIOServer } from 'socket.io';
/**
 * Reusable function to ring a user with an incoming call
 * Can be called from WebSocket handlers or HTTP endpoints
 */
export declare function ringUser(recipientId: string, callerId: string, callId: string, callerName: string): Promise<{
    success: boolean;
    reason?: string;
}>;
/**
 * Ring a specific web user
 */
export declare function ringWebUser(recipientId: string, callerId: string, callId: string, callerName: string): Promise<{
    success: boolean;
    reason?: string;
}>;
export declare function initiateWebCall(socket: any, data: {
    to: string;
    from: string;
    callId: string;
    callerName: string;
}): Promise<{
    success: boolean;
    reason: string | undefined;
} | {
    success: boolean;
    reason?: undefined;
}>;
export declare function setupSocketIOServer(io: SocketIOServer): void;
//# sourceMappingURL=signalingServer.d.ts.map