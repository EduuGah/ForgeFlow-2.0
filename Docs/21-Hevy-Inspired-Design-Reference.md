# 21 - Hevy-Inspired Design Reference

This document captures the product/design direction requested on 2026-09-16.
The goal is to make ForgeFlow strongly inspired by the clarity, density and gym
workflow of Hevy, while keeping ForgeFlow's own identity, data model and visual
system.

## Design North Star

ForgeFlow should feel fast at the gym, dark-first, direct and familiar for a
serious lifter.

Key traits:
- dark interface with high-contrast white text and vivid blue primary actions;
- compact cards and rows, not large decorative dashboards;
- active workout always visible while training;
- exercise media and previous performance visible at the moment of logging;
- profile and analytics focused on useful training evidence;
- user-selectable app themes over time.

## Home

Desired direction:
- feed-style start screen with recent workouts;
- workout card showing athlete/avatar, workout name, duration, volume, PR count
  and the first exercises with thumbnails;
- social elements can exist later, but must not distract from training;
- active workout mini-player pinned above the bottom navigation;
- mini-player opens the active workout and exposes a fast abandon/delete action.

Issue fit:
- FF-015 workout completion and history should create the data needed for recent
  workout cards.
- A later design pass should add the home feed layout and active workout
  mini-player.

## Training/Routines

Desired direction:
- workout tab centered on starting a workout quickly;
- "start empty workout" action;
- routines grouped by folders;
- collapsed/expanded routine folders;
- routine cards with name, exercise preview and primary "start routine" button;
- overflow menu per folder/routine.

Issue fit:
- FF-011 already created basic workout CRUD.
- A future routine organization issue should add folders and better routine
  list UX.

## Active Workout

Desired direction:
- active workout should be a focused full-screen experience;
- top bar with collapse/back, timer/rest icon and "finish" action;
- summary row for duration, volume, completed set count and muscle distribution;
- each exercise block should show thumbnail, exercise name, menu and notes;
- exercise notes must support practical training comments;
- set table should show set number/type, previous performance, weight, reps,
  RPE and completion action;
- warm-up sets should be visually distinct;
- "add set" should be a clear full-width action;
- rest timer should be integrated without slowing set logging;
- tapping exercise name opens exercise detail.

Issue fit:
- FF-013 implemented first local-first set logging.
- FF-014 rest timer should attach directly to this screen.
- FF-015 should finish workout and produce history.
- Later UX refinements should replace the temporary preview form with the full
  set table.

## Exercise Detail

Desired direction:
- dedicated exercise detail screen;
- tabs: summary, history, instructions and ranking;
- summary includes exercise media, primary/secondary muscles, selected metrics
  and charts;
- history shows prior workouts, exercise notes and set rows;
- instructions show step-by-step guidance and media;
- ranking is future/social and should remain optional.

Issue fit:
- FF-016 personal records and FF-017 analytics provide the metric foundation.
- A future exercise detail/media issue should connect catalog media, instructions
  and charts.

## Muscle Distribution

Desired direction:
- interactive muscle distribution panel during and after workouts;
- front/back body map;
- muscles colored from light blue to dark blue based on completed training
  volume or completed set count;
- detail sheet/table listing muscle and completed sets;
- should be accessible: text/table must remain available, not color-only.

Issue fit:
- FF-017 training analytics is the natural first implementation point.
- Later visual polish can replace a simple chart/table with a body-map view.

## Profile

Desired direction:
- profile header with avatar, name, bio/link and training stats;
- show workout count, weight/body metrics and training summaries;
- chart with period filter and metric switch (duration, volume, repetitions);
- dashboard shortcuts such as stats, exercises, measurements and calendar;
- list of recent completed workouts.

Avatar/photo:
- user can change the profile photo;
- photo editor should support crop, rotate and zoom before saving;
- personal photos must follow the media/privacy rules in the security and data
  lifecycle docs.

Issue fit:
- profile editing belongs after auth/profile persistence is available.
- charts and summaries depend on FF-015 through FF-017.

## Themes

Desired direction:
- keep a Hevy-like dark blue theme as the initial visual reference;
- allow the user to choose app theme later;
- likely options: system, dark blue, light, high contrast;
- color theme must not be hard-coded into individual screens.

Issue fit:
- A future design-system issue should introduce theme tokens, persistence and
  settings UI.

## Exercise Catalog Assets

Received source files:
- `C:\Users\RM-USER2\Documents\App ForgeFlow\src\data\exercises.rar`
- `C:\Users\RM-USER2\Documents\App ForgeFlow\dist\exercise-media.zip`

Current handling:
- metadata from `exercises.rar` is suitable for the current system exercise
  catalog shape and can be imported now;
- media files from `exercise-media.zip` are suitable for a future exercise
  media/detail issue;
- the current `Exercise` entity does not yet have media, instructions, tips or
  common mistake fields, so those should not be forced into the schema without a
  planned migration.

Future data model considerations:
- exercise media path or media id;
- instruction steps;
- tips;
- common mistakes;
- original name/source metadata if needed;
- muscle map metadata for body-map analytics.

## Suggested Future Issues

- FF-038 - Hevy-inspired visual design pass and theme tokens.
- FF-039 - Routine folders and improved workout list.
- FF-040 - Exercise detail screen with media and instructions.
- FF-041 - Profile dashboard and editable avatar.
- FF-042 - Muscle distribution body map.
- FF-043 - User-selectable app themes.
