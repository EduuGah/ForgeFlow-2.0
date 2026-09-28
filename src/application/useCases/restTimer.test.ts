import type { RestTimerNotificationGateway } from '../ports/restTimerNotifications';
import { RestTimerController } from './restTimer';

describe('rest timer controller', () => {
  it('uses an absolute deadline and completes after consumers are recreated', async () => {
    const harness = createHarness();
    await harness.controller.start({
      durationSeconds: 90,
      exerciseName: 'Supino reto',
    });

    harness.advanceSeconds(35);
    expect(harness.controller.getSnapshot()).toMatchObject({
      remainingSeconds: 55,
      status: 'running',
    });
    harness.advanceSeconds(55);
    expect(harness.controller.getSnapshot()).toMatchObject({
      endsAt: null,
      remainingSeconds: 0,
      status: 'completed',
    });
    expect(harness.notifications.scheduled).toHaveLength(1);
  });

  it('pauses, resumes and reschedules the completion notification', async () => {
    const harness = createHarness();
    await harness.controller.start({
      durationSeconds: 60,
      exerciseName: 'Remada',
    });
    harness.advanceSeconds(20);

    await expect(harness.controller.pause()).resolves.toMatchObject({
      endsAt: null,
      remainingSeconds: 40,
      status: 'paused',
    });
    harness.advanceSeconds(30);
    expect(harness.controller.getSnapshot()?.remainingSeconds).toBe(40);
    await expect(harness.controller.resume()).resolves.toMatchObject({
      remainingSeconds: 40,
      status: 'running',
    });

    expect(harness.notifications.cancelled).toEqual(['notification-1']);
    expect(harness.notifications.scheduled).toHaveLength(2);
  });

  it('adjusts a running timer and cancels it without losing control state', async () => {
    const harness = createHarness();
    await harness.controller.start({
      durationSeconds: 45,
      exerciseName: 'Agachamento',
    });
    harness.advanceSeconds(5);

    await expect(harness.controller.addSeconds(15)).resolves.toMatchObject({
      durationSeconds: 60,
      remainingSeconds: 55,
    });
    await expect(harness.controller.cancel()).resolves.toBeNull();
    expect(harness.controller.getSnapshot()).toBeNull();
    expect(harness.notifications.cancelled).toEqual([
      'notification-1',
      'notification-2',
    ]);
  });
});

function createHarness() {
  let now = Date.parse('2026-09-28T12:00:00.000Z');
  const notifications = new RecordingRestTimerNotifications();
  return {
    advanceSeconds(seconds: number) {
      now += seconds * 1000;
    },
    controller: new RestTimerController({
      clock: () => new Date(now).toISOString(),
      notifications,
    }),
    notifications,
  };
}

class RecordingRestTimerNotifications implements RestTimerNotificationGateway {
  readonly cancelled: string[] = [];
  readonly scheduled: { endsAt: string; exerciseName: string }[] = [];

  async cancelCompletion(notificationId: string) {
    this.cancelled.push(notificationId);
  }

  async scheduleCompletion(input: { endsAt: string; exerciseName: string }) {
    this.scheduled.push(input);
    return `notification-${this.scheduled.length}`;
  }
}
