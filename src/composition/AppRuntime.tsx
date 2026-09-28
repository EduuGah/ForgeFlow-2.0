import type { PropsWithChildren } from 'react';

import { AppServicesProvider } from './AppServicesProvider';

export function AppRuntime({ children }: PropsWithChildren) {
  return <AppServicesProvider>{children}</AppServicesProvider>;
}
