import type { RankingActivity } from '../../domain/social/rankings';

export const previewRankingActivities: RankingActivity[] = [
  activity('preview-marina', '2026-09-29', 6240),
  activity('preview-marina', '2026-09-24', 5180),
  activity('preview-marina', '2026-09-17', 5920),
  activity('preview-marina', '2026-09-10', 4810),
  activity('preview-marina', '2026-08-28', 5570),
  activity('preview-beatriz', '2026-09-28', 4420),
  activity('preview-beatriz', '2026-09-22', 3960),
  activity('preview-beatriz', '2026-09-15', 4620),
  activity('preview-beatriz', '2026-09-02', 4100),
  activity('preview-rafael', '2026-09-27', 7350),
  activity('preview-rafael', '2026-09-20', 6980),
  activity('preview-rafael', '2026-09-13', 7120),
  activity('preview-rafael', '2026-09-06', 6750),
  activity('preview-rafael', '2026-08-30', 7210),
];

function activity(
  userId: string,
  date: string,
  volume: number,
): RankingActivity {
  return {
    completedAt: `${date}T18:00:00.000Z`,
    userId,
    volume,
    workoutCount: 1,
  };
}
