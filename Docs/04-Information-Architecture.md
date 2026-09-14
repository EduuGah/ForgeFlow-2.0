# 04 — Information Architecture

## Primary navigation

Recommended mobile navigation:

1. Home
2. Treinos
3. Progresso
4. Metas
5. Perfil

Active workout should become a focused full-screen experience and should not depend on the normal navigation shell.

Nutrition can be a dedicated section accessible from Home/Profile or a secondary navigation entry depending on final UX testing.

## Main screens

- Splash/loading
- Onboarding
- Sign in
- Sign up
- Home
- Workout list
- Workout editor
- Workout detail
- Active workout
- Exercise picker
- Exercise detail
- History
- Progress dashboard
- Exercise analytics
- Goals
- Goal detail/create
- Nutrition journal
- Meal editor
- Hydration
- Reports
- Notifications
- Profile
- Settings

## Global states

Every data-driven screen must consider:
- loading
- empty
- populated
- offline
- syncing
- sync error
- permission denied
- validation error
- unexpected error

Do not make offline/sync states intrusive. The app should continue working whenever local data is sufficient.
