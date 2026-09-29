import initSqlJs from 'sql.js';

import { initializeLocalStorage } from '../database/initializeLocalDatabase';
import { SqlJsConnection } from '../testing/sqlJsConnection';
import { createSQLiteRepositories } from './sqliteRepositories';

describe('SQLite social repositories', () => {
  it('restores friendships and blocks after reopening the database', async () => {
    const SQL = await initSqlJs();
    const database = new SQL.Database();
    const connection = new SqlJsConnection(database);
    await initializeLocalStorage(connection);
    const repositories = createSQLiteRepositories(connection);

    await repositories.friendships.saveFriendship({
      addresseeUserId: 'preview-marina',
      createdAt: '2026-09-29T12:00:00.000Z',
      id: 'friendship-1',
      requesterUserId: 'local-preview-user',
      status: 'accepted',
      updatedAt: '2026-09-29T12:00:00.000Z',
    });
    await repositories.userBlocks.saveUserBlock({
      blockedUserId: 'preview-lucas',
      blockerUserId: 'local-preview-user',
      createdAt: '2026-09-29T12:00:00.000Z',
      deletedAt: null,
      id: 'block-1',
      updatedAt: '2026-09-29T12:00:00.000Z',
    });

    const bytes = database.export();
    database.close();
    const reopenedDatabase = new SQL.Database(bytes);
    const reopened = createSQLiteRepositories(
      new SqlJsConnection(reopenedDatabase),
    );

    await expect(
      reopened.friendships.listFriendships({ userId: 'local-preview-user' }),
    ).resolves.toEqual([expect.objectContaining({ id: 'friendship-1' })]);
    await expect(
      reopened.userBlocks.listUserBlocks('local-preview-user'),
    ).resolves.toEqual([expect.objectContaining({ id: 'block-1' })]);
    reopenedDatabase.close();
  });
});
