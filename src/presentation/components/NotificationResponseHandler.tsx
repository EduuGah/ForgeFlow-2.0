import { useEffect } from 'react';
import { Linking } from 'react-native';

import { useAppServices } from '../../composition/AppServicesProvider';

export function NotificationResponseHandler() {
  const services = useAppServices();

  useEffect(
    () =>
      services.notificationDelivery.subscribeToResponses((url) => {
        Linking.openURL(url).catch(() => undefined);
      }),
    [services],
  );

  return null;
}
