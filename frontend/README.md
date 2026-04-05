# HackNU AI Brainstorm Frontend

Frontend skeleton for the HackNU canvas-first AI brainstorming agent.

## What is implemented

- FSD-style structure: `app`, `pages`, `widgets`, `features`, `entities`, `shared`
- Session setup screen with:
  - Sanctum bearer token
  - room id
  - session goal
  - default AI persona
- Brainstorm room with:
  - spatial sticky-note board
  - drag and drop note positioning
  - human note composer
  - AI control panel
  - `review-first` approval flow for agent suggestions
  - board save to `POST /api/rooms/{room_id}/canvas_state`
  - stub realtime adapter prepared for Laravel Echo / Reverb presence channels

## Current architecture

```text
src/
  app/
  pages/
  widgets/
  features/
  entities/
  shared/
```

## Important limitation right now

The project still does not have installed dependencies in this environment, so I did not run `npm install`, `npm run build`, or `npm run lint`.

## Next steps

1. Install `laravel-echo`, `pusher-js`, and a canvas library like `fabric`.
2. Replace `src/shared/api/realtime.js` stub with real `Echo.join(\`room.${roomId}\`)`.
3. Replace the temporary DOM board with Fabric.js or Konva serialization.
4. Connect agent actions to Claude API through your backend or secure API layer.
5. Add voice input if you want the stronger demo path.
