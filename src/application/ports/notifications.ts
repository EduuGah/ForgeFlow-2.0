import type { Notification } from '../../domain/notifications/entities';

export type NotificationPermissionStatus =
  'denied' | 'granted' | 'undetermined' | 'unavailable';

export type PushTokenRegistration = {
  devicePushToken: string | null;
  expoPushToken: string;
  platform: 'android' | 'ios';
};

export interface NotificationDeliveryGateway {
  cancelScheduledNotification(nativeNotificationId: string): Promise<void>;
  getPermissionStatus(): Promise<NotificationPermissionStatus>;
  getPushToken(): Promise<PushTokenRegistration | null>;
  requestPermission(): Promise<NotificationPermissionStatus>;
  scheduleLocalNotification(notification: Notification): Promise<string>;
  subscribeToResponses(listener: (url: string) => void): () => void;
}
