export interface RestTimerNotificationGateway {
  cancelCompletion(notificationId: string): Promise<void>;
  scheduleCompletion(input: {
    endsAt: string;
    exerciseName: string;
  }): Promise<string | null>;
}
