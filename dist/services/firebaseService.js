"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
exports.sendMessageNotification = sendMessageNotification;
exports.sendUpdateNotification = sendUpdateNotification;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
// Initialize Firebase Admin
const fs = require('fs');
let serviceAccount;
const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const cloudRunPath = '/app/secrets/service-account.json';
const localPath = path_1.default.join(process.cwd(), 'firebase-service-account.json');
if (envPath && fs.existsSync(envPath)) {
    serviceAccount = require(path_1.default.isAbsolute(envPath) ? envPath : path_1.default.join(process.cwd(), envPath));
}
else if (fs.existsSync(cloudRunPath)) {
    serviceAccount = require(cloudRunPath);
}
else if (fs.existsSync(localPath)) {
    serviceAccount = require(localPath);
}
else {
    console.warn('[FCM] No service account file found. Notifications may fail.');
}
if (serviceAccount) {
    firebase_admin_1.default.initializeApp({
        credential: firebase_admin_1.default.credential.cert(serviceAccount),
    });
}
async function sendPushNotification(fcmToken, callerId, callerName, callId) {
    // Data-only message - triggers background handler even when app is killed
    // DO NOT include 'notification' field - that prevents background handler from running
    const message = {
        token: fcmToken,
        data: {
            type: 'incoming-call',
            callerId: callerId,
            callerName: callerName,
            callId: callId,
            timestamp: Date.now().toString(),
        },
        android: {
            priority: 'high',
            ttl: 60000, // 60 seconds
        },
        apns: {
            headers: {
                'apns-priority': '10',
                'apns-push-type': 'background',
            },
            payload: {
                aps: {
                    contentAvailable: true,
                },
            },
        },
    };
    try {
        const response = await firebase_admin_1.default.messaging().send(message);
        console.log('[FCM] Call notification sent successfully:', response);
    }
    catch (error) {
        console.error('[FCM] Error sending notification:', error);
    }
}
async function sendMessageNotification(fcmToken, senderId, senderName, messageText, messageId) {
    const message = {
        token: fcmToken,
        notification: {
            title: `New message from ${senderName}`,
            body: messageText,
        },
        data: {
            type: 'new-message',
            senderId: senderId,
            senderName: senderName,
            messageText: messageText,
            messageId: messageId,
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'messages',
                priority: 'high',
                sound: 'default',
            },
        },
    };
    try {
        const response = await firebase_admin_1.default.messaging().send(message);
        console.log('[FCM] Message notification sent successfully:', response);
    }
    catch (error) {
        console.error('[FCM] Error sending message notification:', error);
    }
}
async function sendUpdateNotification(fcmToken, title, message) {
    const notification = {
        token: fcmToken,
        notification: {
            title,
            body: message,
        },
        data: {
            type: 'update',
            title,
            message,
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'updates',
                priority: 'high',
                sound: 'default',
            },
        },
    };
    try {
        const response = await firebase_admin_1.default.messaging().send(notification);
        console.log('[FCM] Update notification sent successfully:', response);
    }
    catch (error) {
        console.error('[FCM] Error sending update notification:', error);
    }
}
exports.default = firebase_admin_1.default;
//# sourceMappingURL=firebaseService.js.map