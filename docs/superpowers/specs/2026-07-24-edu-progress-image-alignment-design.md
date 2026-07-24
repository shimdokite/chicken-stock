# Edu Progress Image Alignment Design

## Goal

Place `/images/main/edu_progress_egg.png` at the right side of the learning-progress card while keeping the text on the left.

## Design

- Keep the existing flex layout and document flow.
- Vertically center the card contents.
- Let the text region consume available width.
- Give the image wrapper automatic left margin and prevent it from shrinking.
- Do not use absolute positioning, because it could overlap the text on narrow screens.

## Scope

Only update the layout classes around the learning-progress text and egg image in `app/(frontend)/components/main/edu-progress/index.tsx`. Do not change data fetching, image priority, copy, or other card behavior.

## Verification

- Run the project lint check for the edited component.
- Confirm that the image wrapper remains at the right edge and does not shrink into the text region.
