import { CallSession } from '../models/types';
export declare class ClientManager {
    private clients;
    private callSessions;
    private mobileUsers;
    private webUsers;
    private userDirectory;
    addClient(userId: string, socket: any): void;
    addMobileUser(userId: string, displayName: string, socket: any, fcmToken?: string): void;
    addWebUser(userId: string, displayName: string, socket: any): void;
    getMobileUser(userId: string): {
        socketId: string;
        displayName: string;
        fcmToken?: string;
        socket: any;
    } | undefined;
    getWebUser(userId: string): {
        socketId: string;
        displayName: string;
        socket: any;
    } | undefined;
    removeMobileUser(userId: string): void;
    removeWebUser(userId: string): void;
    getAllMobileUsers(): Array<{
        id: string;
        name: string;
    }>;
    getAllUsers(): Array<{
        id: string;
        name: string;
        isOnline: boolean;
    }>;
    getUserFromDirectory(userId: string): {
        displayName: string;
        fcmToken: string | undefined;
        isOnline: boolean;
        socket: any;
    } | null;
    removeClient(userId: string): void;
    getClient(userId: string): any | undefined;
    createCallSession(session: CallSession): void;
    getCallSession(callId: string): CallSession | undefined;
    updateCallSession(callId: string, updates: Partial<CallSession>): void;
    endCallSession(callId: string): void;
    getAllSessions(): CallSession[];
    getAllClients(): string[];
}
export declare const clientManager: ClientManager;
//# sourceMappingURL=clientManager.d.ts.map