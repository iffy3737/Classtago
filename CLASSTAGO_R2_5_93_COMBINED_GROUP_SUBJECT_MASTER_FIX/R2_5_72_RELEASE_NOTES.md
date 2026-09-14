# Classtago R2.5.72 — Platform Admin Button Contrast Root Fix

## Root cause found
The project ships a precompiled Tailwind utility stylesheet. The component used `bg-violet-700`, but that background utility is not present in the precompiled stylesheet, so the button could render with a pale/default background while keeping a white label.

## Fix
- Added a dedicated `edx-platform-contact-save-btn` style with explicit high-contrast violet/indigo background and white label/icon.
- Added an explicit readable disabled state (slate background + dark label) instead of opacity fading.
- No gateway logic, OTP routing, database, permissions, or other website workflow changed.
