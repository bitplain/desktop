# Eco Calm Full Restyle Design

## Goal
Apply the Eco Calm design language across all windows, dialogs, pages, and in-app panels while preserving XP wallpaper and cursor. The restyle is visual/structural only; no behavioral changes.

## Scope
- Desktop app windows, titlebars, toolbars, task panes, and list/grid views
- Modals, dialogs, and in-app panels
- Auth/setup/wizard flows and application pages
- Notifications, menus, and sidebars where present

## Non-goals
- No change to XP wallpaper or cursor
- No changes to business logic, data flow, or routing

## Architecture
- Keep Eco Calm tokens in CSS variables for dark/light themes
- Use Eco primitives for window shells, surfaces, forms, lists, and actions
- Add lightweight Eco role classes for legacy markup where full refactor is costly
- Consolidate repeated layouts into primitives to reduce drift

## Component Strategy
- Window chrome: EcoAppWindow, EcoAppTitlebar, EcoChrome for every window shell
- Surfaces: EcoPanel, EcoCard, EcoNotice for nested panels and dialogs
- Forms: EcoForm, EcoInput, EcoTextarea, EcoButton across all inputs
- Lists/menus/toolbars: add missing Eco primitives as needed (EcoList, EcoMenu, EcoToolbar)
- Maintain accessibility roles and focus styles for menus and keyboard flow

## Testing
- Update existing UI tests to reflect new markup
- Add coverage for any new primitives
- Add a lightweight check that all app windows render with Eco window markers

## Risks
- Snapshot/test updates may be needed where markup changes
- Some legacy components may require role classes instead of full refactor

## Rollout
- Audit all window-like components
- Refactor missing areas to primitives or role classes
- Update tests and verify with existing test suite
