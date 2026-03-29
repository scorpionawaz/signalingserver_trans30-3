import { Db, ObjectId } from 'mongodb';
interface Message {
    senderId: string;
    text: string;
    createdAt: Date;
}
interface Conversation {
    _id?: ObjectId;
    conversationId: string;
    createdAt: Date;
    lastMessageAt: Date;
    messages: Message[];
    callTranscripts: Message[];
    participants: string[];
}
declare class ConversationService {
    private db;
    /**
     * Initialize the service with the database connection
     */
    init(db: Db): void;
    /**
     * Generate conversation ID from two participant IDs (always sorted for consistency)
     */
    private getConversationId;
    /**
     * Log a message to the conversation
     * Creates conversation if it doesn't exist, otherwise appends message
     */
    logMessage(senderId: string, recipientId: string, text: string, timestamp?: number): Promise<void>;
    /**
     * Log a transcribed call snippet
     * Stores in a separate array `callTranscripts`
     */
    logCallTranscript(senderId: string, recipientId: string, text: string, timestamp?: number): Promise<void>;
    /**
     * Get a specific conversation by conversationId
     */
    getConversation(conversationId: string): Promise<Conversation | null>;
    /**
     * Get all conversations for a specific user
     */
    getConversationsByUser(userId: string): Promise<Conversation[]>;
}
declare const _default: ConversationService;
export default _default;
//# sourceMappingURL=ConversationService.d.ts.map