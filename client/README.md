# Pet Adoption & Shelter Management System - Client

Frontend application for adopters, shelter staff, and admins.

## Tech
- React 18 + TypeScript
- Vite
- React Router v7
- Redux Toolkit
- TanStack Query
- Tailwind CSS

## Run
```bash
cd client
npm install
```

Create `.env`:
```env
VITE_API_URL=http://localhost:5000/api/v1
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

Start:
```bash
npm run dev
```

## Core UI Features
- Role-aware dashboards and route guards
- Shelter context switching for staff/admin shelter operations
- Pet management, application review, foster board, transfer flows
- Shelter-group messaging UI with real-time updates
- Profile + shelter application workflows
- Notifications and optimistic query refresh patterns

## Recent UI/Behavior Updates
- **Messaging changed to shelter-group model**
  - Adopter chats with shelter thread (not individual staff DM)
  - Shelter staff/admin members can reply in same thread
  - Sender attribution appears in message panel for replies
- **Ask a Question flow**
  - Pet detail button routes to shelter group conversation
  - Handles adopter context for multi-role accounts
- **Application review merge conflict UX**
  - On concurrent edits, UI shows merge conflict panel
  - Loads latest server state instead of generic error toast
- **Role/shelter visibility cleanup**
  - Context-sensitive sidebar/navbar behavior
  - Shelter selection visibility based on role and active context

## Build
```bash
npm run build
npm run preview
```

## Notes
- Client expects server API at `VITE_API_URL`.
- If `/auth/me` errors on guest pages, app initializer now skips auth fetch on auth-only routes.
