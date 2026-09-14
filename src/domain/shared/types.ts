export type EntityId = string;

export type ISODateTimeString = string;

export type Nullable<T> = T | null;

export type TimestampedEntity = {
  createdAt: ISODateTimeString;
  id: EntityId;
  updatedAt: ISODateTimeString;
};

export type SoftDeletableEntity = {
  deletedAt: ISODateTimeString | null;
};

export type UserOwnedEntity = {
  userId: EntityId;
};
