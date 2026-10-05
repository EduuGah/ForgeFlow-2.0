/*
 * Start and end photos for each catalog exercise, from the public-domain
 * Free Exercise DB (github.com/yuhonas/free-exercise-db, Unlicense). Files
 * live in public/exercises/<id>/0.webp and 1.webp (resized to 480px WebP).
 * Keyed by the last 4 digits of the catalog id.
 */
const MEDIA: Record<string, string> = {
  // Costas
  '1001': 'Pullups',
  '1002': 'Chin-Up',
  '1003': 'Wide-Grip_Lat_Pulldown',
  '1004': 'Close-Grip_Front_Lat_Pulldown',
  '1005': 'Seated_Cable_Rows',
  '1006': 'Bent_Over_Barbell_Row',
  '1007': 'One-Arm_Dumbbell_Row',
  '1008': 'T-Bar_Row_with_Handle',
  '1009': 'Barbell_Deadlift',
  '1010': 'Rack_Pulls',
  '1011': 'Straight-Arm_Pulldown',
  '1012': 'Hyperextensions_Back_Extensions',
  '1013': 'Wide-Grip_Rear_Pull-Up',
  '1014': 'Band_Assisted_Pull-Up',
  '1015': 'Underhand_Cable_Pulldowns',
  '1016': 'Seated_One-arm_Cable_Pulley_Rows',
  '1017': 'Leverage_Iso_Row',
  '1018': 'Inverted_Row',
  '1019': 'Barbell_Shrug',
  '1020': 'Dumbbell_Shrug',
  // Bíceps
  '1021': 'Barbell_Curl',
  '1022': 'EZ-Bar_Curl',
  '1023': 'Dumbbell_Bicep_Curl',
  '1024': 'Incline_Dumbbell_Curl',
  '1025': 'Hammer_Curls',
  '1026': 'Concentration_Curls',
  '1027': 'Preacher_Curl',
  '1028': 'Standing_Biceps_Cable_Curl',
  '1029': 'Reverse_Barbell_Curl',
  '1030': 'Zottman_Curl',
  '1031': 'Spider_Curl',
  '1032': 'Drag_Curl',
  '1033': 'Cross_Body_Hammer_Curl',
  '1034': 'Cable_Hammer_Curls_-_Rope_Attachment',
  '1035': 'Machine_Preacher_Curls',
  '1036': 'Standing_One-Arm_Cable_Curl',
  // Peito
  '1037': 'Barbell_Bench_Press_-_Medium_Grip',
  '1038': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  '1039': 'Decline_Barbell_Bench_Press',
  '1040': 'Dumbbell_Bench_Press',
  '1041': 'Incline_Dumbbell_Press',
  '1042': 'Decline_Dumbbell_Bench_Press',
  '1043': 'Pushups',
  '1044': 'Incline_Push-Up',
  '1045': 'Decline_Push-Up',
  '1046': 'Dumbbell_Flyes',
  '1047': 'Incline_Dumbbell_Flyes',
  '1048': 'Cable_Crossover',
  '1049': 'Low_Cable_Crossover',
  '1050': 'Butterfly',
  '1051': 'Dips_-_Chest_Version',
  '1052': 'Pushups_Close_and_Wide_Hand_Positions',
  '1053': 'Push-Ups_-_Close_Triceps_Position',
  '1054': 'Dips_-_Chest_Version',
  '1055': 'Cable_Crossover',
  '1056': 'Machine_Bench_Press',
  '1057': 'Butterfly',
  // Core
  '1058': 'Crunches',
  '1059': '3_4_Sit-Up',
  '1060': 'Flat_Bench_Lying_Leg_Raise',
  '1061': 'Hanging_Leg_Raise',
  '1062': 'Russian_Twist',
  '1063': 'Plank',
  '1064': 'Side_Bridge',
  '1065': 'Mountain_Climbers',
  '1066': 'Air_Bike',
  '1067': 'Cable_Crunch',
  '1068': 'Reverse_Crunch',
  '1069': 'Ab_Roller',
  '1070': 'Rope_Crunch',
  '1071': 'Knee_Hip_Raise_On_Parallel_Bars',
  '1072': 'Flutter_Kicks',
  '1073': 'Dead_Bug',
  '1074': 'Jackknife_Sit-Up',
  '1075': 'Standing_Cable_Wood_Chop',
  // Pernas
  '1076': 'Barbell_Squat',
  '1077': 'Front_Barbell_Squat',
  '1078': 'Leg_Press',
  '1079': 'Leg_Extensions',
  '1080': 'Lying_Leg_Curls',
  '1081': 'Romanian_Deadlift',
  '1082': 'Stiff-Legged_Barbell_Deadlift',
  '1083': 'Bodyweight_Walking_Lunge',
  '1084': 'Split_Squat_with_Dumbbells',
  '1085': 'Barbell_Hip_Thrust',
  '1086': 'Standing_Calf_Raises',
  '1087': 'Seated_Calf_Raise',
  '1088': 'Goblet_Squat',
  '1089': 'Hack_Squat',
  '1090': 'Sumo_Deadlift',
  '1091': 'Good_Morning',
  '1092': 'Butt_Lift_Bridge',
  '1093': 'Pull_Through',
  '1094': 'Seated_Leg_Curl',
  '1095': 'Standing_Leg_Curl',
  '1096': 'Smith_Machine_Squat',
  '1097': 'Calf_Press_On_The_Leg_Press_Machine',
  // Ombros
  '1098': 'Standing_Military_Press',
  '1099': 'Standing_Dumbbell_Press',
  '1100': 'Arnold_Dumbbell_Press',
  '1101': 'Side_Lateral_Raise',
  '1102': 'Cable_Seated_Lateral_Raise',
  '1103': 'Front_Dumbbell_Raise',
  '1104': 'Reverse_Flyes',
  '1105': 'Face_Pull',
  '1106': 'Upright_Barbell_Row',
  '1107': 'Dumbbell_Shrug',
  '1108': 'Seated_Barbell_Military_Press',
  '1109': 'Seated_Dumbbell_Press',
  '1110': 'Machine_Shoulder_Military_Press',
  '1111': 'Front_Cable_Raise',
  '1112': 'Front_Plate_Raise',
  '1113': 'Reverse_Machine_Flyes',
  '1114': 'Standing_Front_Barbell_Raise_Over_Head',
  // Tríceps
  '1115': 'Triceps_Pushdown',
  '1116': 'Triceps_Pushdown_-_Rope_Attachment',
  '1117': 'Cable_Rope_Overhead_Triceps_Extension',
  '1118': 'Lying_Triceps_Press',
  '1119': 'EZ-Bar_Skullcrusher',
  '1120': 'Close-Grip_Barbell_Bench_Press',
  '1121': 'Bench_Dips',
  '1122': 'Dips_-_Triceps_Version',
  '1123': 'Tricep_Dumbbell_Kickback',
  '1124': 'Dumbbell_One-Arm_Triceps_Extension',
  '1125': 'Cable_One_Arm_Tricep_Extension',
  '1126': 'Standing_Dumbbell_Triceps_Extension',
  '1127': 'EZ-Bar_Skullcrusher',
  '1128': 'Reverse_Grip_Triceps_Pushdown',
  '1129': 'Body_Tricep_Press',
  '1130': 'Machine_Triceps_Extension',
};

const CATALOG_PREFIX = '00000000-0000-4000-8000-00000000';

export interface ExerciseMedia {
  start: string;
  end: string;
}

/** Start/end photos of a catalog exercise; custom exercises have none. */
export function exerciseMedia(exerciseId: string): ExerciseMedia | null {
  if (!exerciseId.startsWith(CATALOG_PREFIX)) return null;
  const folder = MEDIA[exerciseId.slice(CATALOG_PREFIX.length)];
  if (!folder) return null;
  const base = `/exercises/${encodeURIComponent(folder)}`;
  return { start: `${base}/0.webp`, end: `${base}/1.webp` };
}

/** Every media folder, for scripts and tests. */
export const MEDIA_FOLDERS = [...new Set(Object.values(MEDIA))];
