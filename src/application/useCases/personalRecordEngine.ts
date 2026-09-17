import type { EntityId, ISODateTimeString } from '../../domain/shared/types';
import type { SyncOperation } from '../../domain/sync/entities';
import type {
  PersonalRecord,
  PersonalRecordType,
  WorkoutSession,
} from '../../domain/training/entities';
import {
  getPersonalRecordCandidates,
  isNewPersonalRecord,
} from '../../domain/training/personalRecords';
import type { RepositoryProvider } from '../ports/repositories';

type PersonalRecordRepositories = Pick<
  RepositoryProvider,
  'personalRecords' | 'sessionExercises' | 'sets' | 'syncOperations'
>;

type PersonalRecordDependencies = {
  clock: () => ISODateTimeString;
  generateId: () => EntityId;
  repositories: PersonalRecordRepositories;
};

export async function createPersonalRecordsForSession(
  input: { session: WorkoutSession },
  dependencies: PersonalRecordDependencies,
) {
  const sessionExercises =
    await dependencies.repositories.sessionExercises.listSessionExercises({
      sessionId: input.session.id,
    });
  const created: PersonalRecord[] = [];

  for (const sessionExercise of sessionExercises) {
    const sets = await dependencies.repositories.sets.listTrainingSets({
      sessionExerciseId: sessionExercise.id,
    });
    const records =
      await dependencies.repositories.personalRecords.listPersonalRecords({
        exerciseId: sessionExercise.exerciseId,
        userId: input.session.userId,
      });
    const existingSourceKeys = new Set(
      records.map((record) =>
        getSourceKey(
          record.sourceSetId,
          record.recordType,
          record.contextWeightKg,
        ),
      ),
    );

    for (const set of sets.sort(
      (left, right) => left.setNumber - right.setNumber,
    )) {
      for (const candidate of getPersonalRecordCandidates(set)) {
        const sourceKey = getSourceKey(
          set.id,
          candidate.recordType,
          candidate.contextWeightKg,
        );
        if (
          existingSourceKeys.has(sourceKey) ||
          !isNewPersonalRecord(candidate, records)
        )
          continue;

        const now = dependencies.clock();
        const record: PersonalRecord = {
          achievedAt: set.completedAt ?? now,
          contextWeightKg: candidate.contextWeightKg,
          createdAt: now,
          exerciseId: sessionExercise.exerciseId,
          id: dependencies.generateId(),
          recordType: candidate.recordType,
          sourceSetId: set.id,
          updatedAt: now,
          userId: input.session.userId,
          value: candidate.value,
        };
        await dependencies.repositories.syncOperations.enqueueSyncOperation(
          createRecordSyncOperation(record, dependencies),
        );
        await dependencies.repositories.personalRecords.savePersonalRecord(
          record,
        );
        existingSourceKeys.add(sourceKey);
        records.push(record);
        created.push(record);
      }
    }
  }

  return created;
}

function getSourceKey(
  sourceSetId: EntityId,
  recordType: PersonalRecordType,
  contextWeightKg: number | null,
) {
  return `${sourceSetId}:${recordType}:${contextWeightKg ?? 'global'}`;
}

function createRecordSyncOperation(
  record: PersonalRecord,
  dependencies: Pick<PersonalRecordDependencies, 'clock' | 'generateId'>,
): SyncOperation {
  return {
    attemptCount: 0,
    createdAt: dependencies.clock(),
    entityId: record.id,
    entityType: 'personal_record',
    lastAttemptAt: null,
    lastError: null,
    operationId: dependencies.generateId(),
    operationType: 'upsert',
    payload: record,
    status: 'pending',
  };
}
