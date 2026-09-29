# 23 - Accessibility Audit

## Scope

FF-031 reviews the main local-first flows: Home, workouts and active workout,
history, exercise library, progress, goals, profile/authentication,
notifications, nutrition, hydration and consolidated reports.

## Implemented baseline

- Screen titles, section titles and empty-state titles expose heading semantics.
- Loading states expose a busy progress role and errors expose alert semantics.
- Asynchronous success, upload and preference messages use live regions.
- Every `Pressable` declares an accessibility role.
- Icon-only actions provide explicit labels that describe their result.
- Every `TextInput` provides an explicit accessible label instead of relying on
  placeholder text.
- Tabs and radio groups expose selected state.
- Toggle-style filters and favorite actions expose selected state in addition
  to their visual treatment.
- Disabled and busy controls expose their state while work is in progress.
- Goal, hydration and loading progress expose progress-bar semantics and values.
- Analytics charts provide a textual date range and peak value, so their
  information does not depend on the line color.
- Achievement cards announce their title, description and locked/unlocked state.
- Principal interactive controls use a minimum 44 x 44 point target.

## Contrast

The automated palette checks require a minimum 4.5:1 ratio for normal text.
The pass darkens `textSubtle` and `warning` while retaining the current visual
identity. Covered combinations include primary, muted, subtle, accent, danger,
warning and success text, plus primary and destructive button labels.

## Automated checks

`src/presentation/accessibility.test.tsx` verifies:

- shared screen and section heading hierarchy;
- semantic loading and error feedback;
- WCAG AA contrast for text combinations used by the current theme;
- preservation of ordinary screen content through the shared layout.

The source audit additionally confirms that every presentation `Pressable` has
an accessibility role and every presentation `TextInput` has an accessible
label.

## Release-device checklist

These checks require an Android release build and cannot be represented fully by
the web preview or unit tests:

1. Traverse Home, Treinos, Progresso, Metas and Perfil with TalkBack.
2. Complete registration, workout logging and goal creation without touch.
3. Verify logical focus after opening and closing inline editors.
4. Validate set logging and rest-timer controls with Switch Access.
5. Test system font scales at 100%, 150% and 200% on small and large screens.
6. Confirm that keyboard focus remains visible in web builds.
7. Confirm loading, error, completion and upload messages are announced once.
8. Check that motion and future animations respect reduced-motion settings.

## Known follow-up

The visual redesign in FF-038 may change colors, layouts and navigation. It must
preserve this semantic baseline and rerun both the automated contrast suite and
the release-device checklist. Reduced-motion handling becomes actionable when
that issue introduces the planned animations.
