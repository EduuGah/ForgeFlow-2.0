# 02 — Product Requirements

## Functional areas

### Authentication
- Create account
- Sign in
- Sign out
- Session persistence
- Password reset/recovery strategy
- Account deletion
- Privacy controls

### Profile
- Name
- Profile photo
- Body weight history
- Optional height
- Training experience
- Main goal
- Training frequency preference

### Exercise library
- Exercise name
- Muscle groups
- Equipment
- Instructions
- User-created exercises
- Favorites
- Search/filter
- Stable IDs

FF-010 implements the first exercise library slice with a local system catalog,
search/filter, favorites, and user-created exercises behind application use
cases. Workout composition is handled by later workout CRUD issues.

### Workouts
- Create/edit/delete
- Duplicate
- Add/reorder/remove exercises
- Configure planned sets
- Optional target weight/reps
- Optional default rest
- Save as template
- Start workout

FF-011 implements workout template CRUD: create, edit, duplicate, archive,
soft delete, add/reorder/remove exercises, and planned targets for sets, reps,
weight and rest. Starting an active workout remains scoped to FF-012.

### Active workout
For each set:
- set number
- warm-up or working set
- weight
- repetitions
- optional rest
- completion state
- timestamp
- optional note

The active workout must survive app restarts and temporary offline periods.

FF-012 implements starting a workout from a saved template, creating an active
session with exercise snapshots, recovering the active session from local state
and abandoning it without deleting local data. Set logging is scoped to FF-013.

FF-013 implements local-first set logging during an active workout. Each set is
persisted immediately with set number, warm-up/working type, weight, repetitions,
optional rest, completion timestamp and optional notes. Invalid values are
rejected before persistence, and the write is enqueued for synchronization.

### History
- Completed workouts
- Date/time
- Duration
- Exercises
- Sets
- Volume
- PRs
- Search/filter
- Workout detail

### PRs
MVP:
- Weight PR: maximum weight in a valid working set
- Volume PR: maximum weight × reps in a valid working set
- Rep PR: maximum repetitions for a comparable exercise/load context

Derived metric:
- Estimated 1RM, clearly labeled as an estimate

### Progress
- Exercise progression

FF-017 implements the first training analytics slice. It aggregates completed
workouts, working-set volume and repetitions, duration, frequency, exercise
performance and personal records for explicit date ranges. The result includes
an equal-length previous-period comparison and serializable chart/export data.
- Weight
- Volume
- Repetitions
- Frequency
- Workout duration
- PR history
- Muscle-group distribution
- Personal dashboards
- Tables
- Charts
- Period filters
- Comparisons
- Clearly labeled projections

### Goals
Goal types:
- exercise weight
- exercise repetitions
- exercise volume
- workout frequency
- monthly workout count
- total volume
- body weight
- PR achievement
- custom measurable goal

Every goal supports:
- title
- metric
- target
- optional deadline
- baseline captured at creation
- progress
- status

Statuses:
- active
- on_track
- behind
- completed
- expired
- paused
- cancelled

FF-018 implements goal creation and editing for every listed goal type, optional
deadlines, baseline capture and the active, paused and cancelled lifecycle. Goals
linked to training data calculate their initial baseline from completed workouts;
body-weight and custom goals collect the current value from the user.

### Nutrition
Lightweight journal, not a full calorie database:
- photo
- meal type
- date/time
- total kcal
- optional protein
- optional carbohydrate
- optional fat
- notes

### Water
- daily water entries
- daily total
- optional daily target

### Reports
- workout report
- progression report
- goals report
- nutrition report
- hydration report
- combined report
- exportable structured data for AI analysis
- exportable human-readable report for professionals

### Notifications
- workout reminders
- goal progress
- goal completion
- PRs
- inactivity
- consistency
- report availability
- optional nutrition/hydration reminders
- notification center
- per-category preferences
- quiet hours
- deduplication

### Future social
- friends
- profiles
- rankings
- competitions
- challenges
- achievements
- shareable milestones
