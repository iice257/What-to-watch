# Phase 2 UI

## Product surfaces

1. Intro and loading screen
2. Interactive movie discovery canvas
3. Focused movie title card
4. Movie detail drawer
5. Similar movie recommendations
6. Settings and movie filters
7. Favorites and saved canvas positions
8. About, controls, and technical information
9. Custom external link editor
10. Keyboard tutorial
11. Performance HUD

## Primary actions

- Navigate the movie canvas with pointer, touch, wheel, and keyboard controls.
- Open a movie from its poster or title card.
- Scroll into a movie and continuously zoom back out to the canvas.
- Open TMDB, IMDb, and user-defined external links.
- Save, remove, clear, and revisit favorite movies.
- Jump to a favorite movie's saved canvas position.
- Move between similar movies without leaving the detail drawer.
- Filter by genre, release year, and runtime.
- Reshuffle the movie grid.
- Toggle theme, fullscreen, developer tools, and interface visibility.
- Pin, expand, collapse, hide, or show the FPS HUD.
- Add, share, and remove custom link types.

## Phase 2 changes

- Introduced a graphite cinematic surface system with restrained blur, borders, shadows, and mint accent states.
- Replaced scattered navigation icons with unified desktop and mobile toolbars.
- Rebuilt the focused movie card with poster, score, metadata, genres, and a clear open-details affordance.
- Reworked the detail drawer into an editorial layout with stronger metadata hierarchy and scannable similar-film rows.
- Structured settings into render profile, movie filters, and display/tool sections.
- Rebuilt favorites as a compact poster-led media list with explicit actions and a designed empty state.
- Refined the intro/loading state to mask canvas initialization and orientation changes.
- Standardized buttons, badges, inputs, selects, switches, drawers, custom-link forms, and the FPS HUD.
- Added accessible labels and titles to the main toolbar and movie actions.
- Preserved the existing WebGL renderer, Chromium render profile, mobile/Safari behavior, scroll behavior, and interaction model.

## Verification

- Production build: passed.
- Targeted render profile, grid, and HUD tests: 11 passed.
- Desktop browser states checked: canvas, movie detail, settings, favorites, intro.
- Mobile browser states checked: canvas and movie detail.

## Visual artifacts

- `concept-desktop.png`
- `screenshots/desktop-canvas.png`
- `screenshots/desktop-detail.png`
- `screenshots/desktop-settings.png`
- `screenshots/desktop-favorites.png`
- `screenshots/desktop-intro.png`
- `screenshots/mobile-canvas.png`
- `screenshots/mobile-detail.png`
