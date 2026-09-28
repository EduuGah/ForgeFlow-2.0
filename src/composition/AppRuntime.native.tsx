import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { type PropsWithChildren, useMemo } from 'react';

import { initializeLocalDatabase } from '../data/database/initializeLocalDatabase';
import { createExpoSQLiteConnection } from '../data/database/expoSQLiteConnection';
import { createSQLiteRepositories } from '../data/repositories/sqliteRepositories';
import { AppServicesProvider } from './AppServicesProvider';
import { createAppServices } from './createAppServices';

export function AppRuntime({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider
      databaseName="forgeflow.db"
      onInit={initializeLocalDatabase}
    >
      <SQLiteServices>{children}</SQLiteServices>
    </SQLiteProvider>
  );
}

function SQLiteServices({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const services = useMemo(
    () =>
      createAppServices(
        createSQLiteRepositories(createExpoSQLiteConnection(database)),
      ),
    [database],
  );

  return (
    <AppServicesProvider services={services}>{children}</AppServicesProvider>
  );
}
