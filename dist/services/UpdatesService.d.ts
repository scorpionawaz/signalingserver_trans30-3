import { Db } from 'mongodb';
interface CreateUpdateParams {
    userId: string;
    type: 'agent-call' | 'missed-call' | 'missed-message';
    title: string;
    message: string;
    relatedUserId?: string;
    relatedUserName?: string;
    metadata?: any;
}
declare class UpdatesService {
    private db;
    /**
     * Initialize the service with database connection
     */
    init(db: Db): void;
    /**
     * Create an update entry and send push notification
     */
    createUpdate(update: CreateUpdateParams): Promise<void>;
    /**
     * Get updates for a user
     */
    getUpdates(userId: string, limit?: number): Promise<any[]>;
    /**
     * Mark updates as read
     */
    markAsRead(userId: string, updateIds: string[]): Promise<void>;
    /**
     * Get unread count for a user
     */
    getUnreadCount(userId: string): Promise<number>;
}
declare const _default: UpdatesService;
export default _default;
//# sourceMappingURL=UpdatesService.d.ts.map