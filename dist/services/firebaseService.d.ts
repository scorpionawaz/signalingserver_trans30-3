import admin from 'firebase-admin';
export declare function sendPushNotification(fcmToken: string, callerId: string, callerName: string, callId: string): Promise<void>;
export declare function sendMessageNotification(fcmToken: string, senderId: string, senderName: string, messageText: string, messageId: string): Promise<void>;
export declare function sendUpdateNotification(fcmToken: string, title: string, message: string): Promise<void>;
export default admin;
//# sourceMappingURL=firebaseService.d.ts.map