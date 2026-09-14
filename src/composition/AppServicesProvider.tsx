import { createContext, PropsWithChildren, useContext, useMemo } from 'react';

import { createAppServices, type AppServices } from './createAppServices';

const AppServicesContext = createContext<AppServices | null>(null);

type AppServicesProviderProps = PropsWithChildren<{
  services?: AppServices;
}>;

export function AppServicesProvider({
  children,
  services,
}: AppServicesProviderProps) {
  const value = useMemo(() => services ?? createAppServices(), [services]);

  return (
    <AppServicesContext.Provider value={value}>
      {children}
    </AppServicesContext.Provider>
  );
}

export function useAppServices() {
  const services = useContext(AppServicesContext);

  if (!services) {
    throw new Error('App services were read outside AppServicesProvider.');
  }

  return services;
}
