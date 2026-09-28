import type { EntityId, ISODateTimeString } from '../shared/types';

export type HydrationEntry = {
  amountMl: number;
  createdAt: ISODateTimeString;
  deletedAt: ISODateTimeString | null;
  id: EntityId;
  recordedAt: ISODateTimeString;
  updatedAt: ISODateTimeString;
  userId: EntityId;
};

export type HydrationGoal = {
  createdAt: ISODateTimeString;
  deletedAt: ISODateTimeString | null;
  id: EntityId;
  targetMl: number;
  updatedAt: ISODateTimeString;
  userId: EntityId;
};

export type HydrationSummary = {
  entryCount: number;
  goal: HydrationGoal | null;
  progress: number | null;
  remainingMl: number | null;
  totalMl: number;
};

export type HydrationReminderContext = {
  lastRecordedAt: ISODateTimeString | null;
  remainingMl: number | null;
  shouldRemind: boolean;
  targetMl: number | null;
  totalMl: number;
};
