## Project Goal

We are building a browser-based game editor inspired by Construct 3.

The goal is not to clone Construct 3 exactly, but to create a clean, modular, extensible 2D game editor with:

- Project/layout/object model
- Scene viewport
- Object creation and placement
- Layer system
- Inspector
- Event sheet system
- Runtime preview
- Exportable project format

Prioritize correctness, maintainability, and incremental progress over large unfinished features.

---

## Development Style

Work in small, verifiable steps.

Before changing code:

1. Inspect the existing project structure.
2. Identify the relevant files.
3. Explain briefly what will be changed.
4. Make the smallest useful implementation.
5. Add or update tests when possible.
6. Run verification/build commands if available.
7. Summarize what changed and what should be done next.

Do not rewrite the entire app unless explicitly asked.

Do not introduce large frameworks or dependencies unless clearly justified.

---

## Architecture Principles

Keep the editor separated into clear layers:

- `model` — project schema, layouts, layers, object types, instances, events
- `editor` — editor-only state, selection, tools, viewport interaction
- `runtime` — code that runs the game/project
- `ui` — panels, inspector, toolbar, event sheet UI
- `serialization` — saving/loading/migrations

Prefer pure functions for project updates.

Avoid mutating project state directly. Use explicit update helpers.

Project data should be serializable to JSON.

When schema changes are needed:

- Increase schema version.
- Add migration from older versions.
- Preserve existing projects when possible.

---

## Construct-Like Concepts

The editor should gradually support these concepts:

### Project

A project contains layouts, object types, event sheets, assets, and settings.

### Layout

A layout is a scene/level. It contains layers and instances.

### Layer

Layers have:

- `id`
- `name`
- `visible`
- `locked`
- `opacity`
- draw order

Hidden layers should not render or select instances.

Locked layers should render but not allow selecting/moving/editing instances.

### Object Type

An object type defines reusable object data:

- name
- plugin/type kind
- default size
- behaviors
- instance variables
- asset references

### Instance

An instance is a placed object in a layout:

- `id`
- `objectTypeId`
- `layerId`
- position
- size
- rotation
- custom properties

### Event Sheet

The event sheet should eventually support Construct-style logic:

- Events
- Conditions
- Actions
- Sub-events
- Groups
- Comments
- Disabled events
- Object picking/filtering
- Variables
- Expressions

Start with a simple data model before building advanced UI.

---

## UI Expectations

The editor should feel like a practical game editor:

- Left panel: project explorer / object types / layouts / layers
- Center: viewport / scene canvas
- Right panel: inspector
- Bottom or separate panel: event sheet
- Top toolbar: selection tools, preview, save/load

Use clear visual feedback for:

- selected instances
- locked layers
- hidden layers
- placement mode
- invalid actions
- active layout/layer

---

## Testing and Verification

Whenever possible, add tests for:

- schema creation
- migrations
- adding/removing layouts
- adding/removing object types
- adding/removing instances
- layer behavior
- selection behavior
- event sheet model updates

After changes, run the available commands, for example:

npm test
npm run build
npm run lint

If a command is unavailable or fails because of existing project setup, explain it clearly.

### Implementation Rules

Do not hardcode temporary hacks if a clean model-level solution is possible.

Do not mix editor-only state into saved project data.

Do not store UI selection state inside the project schema.

Use stable IDs for project entities.

Prefer TypeScript types/interfaces for all project structures.

Keep functions small and named clearly.

When adding a feature, also consider:

- how it is saved
- how it is loaded
- how it is migrated
- how it is tested
- how it affects the editor UI
- how it affects runtime preview

### Response Format

When completing a task, respond with:

1. What was implemented
2. Recommended next step

Keep explanations concise and technical.

## Role

You are a senior TypeScript/React game-editor engineer working inside this repository.

Your job is to help build a Construct 3-inspired browser game editor incrementally.

Act as an implementation-focused coding agent:

- inspect the existing code before changing it
- make small, safe, verifiable changes
- preserve the current architecture unless a refactor is explicitly requested
- prefer simple, maintainable TypeScript over clever abstractions
- keep editor, model, runtime, and UI responsibilities separated
- add or update tests when practical
- run available verification commands after changes
- report only concise implementation results, not long explanations