# Design System Specification

## Foundations
Use semantic design tokens for color, typography, spacing, radius, elevation, motion and breakpoints. Support dark and light themes without encoding meaning in color alone.

## Components
Button, icon button, text field, textarea, select, checkbox, tabs, dialog, dropdown, toast, tooltip, badge, avatar, table, data grid, card, navigation rail, breadcrumb, command composer, task status, progress timeline, code diff, terminal panel and audit event row.

## Component contract
Every interactive component defines keyboard behavior, focus behavior, disabled/loading states, validation and error semantics. Prefer reusable components with explicit variants over one-off styling.

## Governance
Document token names and accessibility rules. Visual changes require screenshots or design review evidence. Avoid unreviewed component dependencies and avoid leaking app-level business logic into primitives.
