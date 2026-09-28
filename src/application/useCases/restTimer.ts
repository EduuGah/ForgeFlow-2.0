import type { RestTimerNotificationGateway } from '../ports/restTimerNotifications';

export type RestTimerSnapshot = {
  durationSeconds: number;
  endsAt: string | null;
  exerciseName: string;
  remainingSeconds: number;
  status: 'completed' | 'paused' | 'running';
};

type StoredRestTimer = RestTimerSnapshot & {
  notificationId: string | null;
};

export class RestTimerController {
  private timer: StoredRestTimer | null = null;

  constructor(
    private readonly dependencies: {
      clock: () => string;
      notifications: RestTimerNotificationGateway;
    },
  ) {}

  getSnapshot(): RestTimerSnapshot | null {
    if (!this.timer) return null;
    this.refreshRunningTimer();
    return publicSnapshot(this.timer);
  }

  async start(input: { durationSeconds: number; exerciseName: string }) {
    if (
      !Number.isInteger(input.durationSeconds) ||
      input.durationSeconds <= 0
    ) {
      throw new Error('O descanso deve ter uma duracao positiva em segundos.');
    }
    await this.cancelScheduledCompletion();
    const endsAt = addSeconds(this.dependencies.clock(), input.durationSeconds);
    this.timer = {
      durationSeconds: input.durationSeconds,
      endsAt,
      exerciseName: input.exerciseName,
      notificationId: null,
      remainingSeconds: input.durationSeconds,
      status: 'running',
    };
    await this.scheduleCompletion();
    return this.getSnapshot();
  }

  async pause() {
    this.refreshRunningTimer();
    if (!this.timer || this.timer.status !== 'running') {
      return this.getSnapshot();
    }
    await this.cancelScheduledCompletion();
    this.timer = { ...this.timer, endsAt: null, status: 'paused' };
    return this.getSnapshot();
  }

  async resume() {
    if (!this.timer || this.timer.status !== 'paused') {
      return this.getSnapshot();
    }
    if (this.timer.remainingSeconds <= 0) {
      this.timer = { ...this.timer, endsAt: null, status: 'completed' };
      return this.getSnapshot();
    }
    this.timer = {
      ...this.timer,
      endsAt: addSeconds(
        this.dependencies.clock(),
        this.timer.remainingSeconds,
      ),
      status: 'running',
    };
    await this.scheduleCompletion();
    return this.getSnapshot();
  }

  async addSeconds(seconds: number) {
    if (!Number.isInteger(seconds) || seconds <= 0 || !this.timer) {
      return this.getSnapshot();
    }
    this.refreshRunningTimer();
    const remainingSeconds = this.timer.remainingSeconds + seconds;
    this.timer = {
      ...this.timer,
      durationSeconds: this.timer.durationSeconds + seconds,
      endsAt:
        this.timer.status === 'running'
          ? addSeconds(this.dependencies.clock(), remainingSeconds)
          : null,
      remainingSeconds,
      status: this.timer.status === 'completed' ? 'paused' : this.timer.status,
    };
    if (this.timer.status === 'running') {
      await this.cancelScheduledCompletion();
      await this.scheduleCompletion();
    }
    return this.getSnapshot();
  }

  async cancel() {
    await this.cancelScheduledCompletion();
    this.timer = null;
    return null;
  }

  private refreshRunningTimer() {
    if (!this.timer || this.timer.status !== 'running' || !this.timer.endsAt) {
      return;
    }
    const remainingSeconds = Math.max(
      0,
      Math.ceil(
        (Date.parse(this.timer.endsAt) -
          Date.parse(this.dependencies.clock())) /
          1000,
      ),
    );
    this.timer = {
      ...this.timer,
      endsAt: remainingSeconds === 0 ? null : this.timer.endsAt,
      remainingSeconds,
      status: remainingSeconds === 0 ? 'completed' : 'running',
    };
  }

  private async scheduleCompletion() {
    if (!this.timer?.endsAt) return;
    try {
      const notificationId =
        await this.dependencies.notifications.scheduleCompletion({
          endsAt: this.timer.endsAt,
          exerciseName: this.timer.exerciseName,
        });
      if (this.timer) this.timer.notificationId = notificationId;
    } catch {
      // The in-app timer remains authoritative when native delivery is unavailable.
    }
  }

  private async cancelScheduledCompletion() {
    const notificationId = this.timer?.notificationId;
    if (!notificationId) return;
    try {
      await this.dependencies.notifications.cancelCompletion(notificationId);
    } catch {
      // Cancellation failure must not block timer controls.
    }
    if (this.timer) this.timer.notificationId = null;
  }
}

function publicSnapshot(timer: StoredRestTimer): RestTimerSnapshot {
  const { notificationId: _notificationId, ...snapshot } = timer;
  return snapshot;
}

function addSeconds(timestamp: string, seconds: number) {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString();
}
