import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type {
  NotificationDeliveryGateway,
  NotificationPermissionStatus,
} from '../../application/ports/notifications';
import type { Notification } from '../../domain/notifications/entities';
import { notificationDeepLink } from '../../domain/notifications/deepLinks';

const ANDROID_CHANNEL_ID = 'forgeflow-default';
let lastHandledResponseId: string | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class ExpoNotificationGateway implements NotificationDeliveryGateway {
  async cancelScheduledNotification(nativeNotificationId: string) {
    if (Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(nativeNotificationId);
  }

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    if (Platform.OS === 'web') return 'unavailable';
    const permissions = await Notifications.getPermissionsAsync();
    return permissionStatus(permissions.status, permissions.granted);
  }

  async getPushToken() {
    if (Platform.OS === 'web' || !Device.isDevice) return null;
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (typeof projectId !== 'string' || !projectId) return null;

    await ensureAndroidChannel();
    const [expoToken, deviceToken] = await Promise.all([
      Notifications.getExpoPushTokenAsync({ projectId }),
      Notifications.getDevicePushTokenAsync(),
    ]);
    return {
      devicePushToken:
        typeof deviceToken.data === 'string'
          ? deviceToken.data
          : JSON.stringify(deviceToken.data),
      expoPushToken: expoToken.data,
      platform: Platform.OS as 'android' | 'ios',
    };
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (Platform.OS === 'web') return 'unavailable';
    await ensureAndroidChannel();
    const permissions = await Notifications.requestPermissionsAsync();
    return permissionStatus(permissions.status, permissions.granted);
  }

  async scheduleLocalNotification(notification: Notification) {
    if (Platform.OS === 'web') {
      throw new Error('Native notifications are unavailable on web.');
    }
    await ensureAndroidChannel();
    const deliveryDate = new Date(notification.scheduledFor);
    const trigger: Notifications.NotificationTriggerInput =
      deliveryDate.getTime() > Date.now()
        ? {
            channelId:
              Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
            date: deliveryDate,
            type: Notifications.SchedulableTriggerInputTypes.DATE,
          }
        : {
            channelId:
              Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
            seconds: 1,
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          };

    return Notifications.scheduleNotificationAsync({
      content: {
        body: notification.body,
        data: {
          ...(notification.data ?? {}),
          dedupeKey: notification.dedupeKey,
          notificationId: notification.id,
          url: notificationDeepLink(notification.data),
        },
        title: notification.title,
      },
      trigger,
    });
  }

  subscribeToResponses(listener: (url: string) => void) {
    if (Platform.OS === 'web') return () => undefined;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (responseId === lastHandledResponseId) return;
      const url = notificationDeepLink(
        response.notification.request.content.data,
      );
      if (url) {
        lastHandledResponseId = responseId;
        listener(url);
      }
    };
    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch(() => undefined);
    return () => subscription.remove();
  }
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    importance: Notifications.AndroidImportance.HIGH,
    name: 'ForgeFlow',
  });
}

function permissionStatus(
  status: string,
  granted: boolean,
): NotificationPermissionStatus {
  if (granted || status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}
