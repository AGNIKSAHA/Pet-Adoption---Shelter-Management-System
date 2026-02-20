# Pet Adoption & Shelter Management System - Server

Backend API for shelter operations, pet lifecycle, adoption, foster workflows, messaging, notifications, and audit logging.

## Tech
- Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT auth (access + refresh cookies)
- Bull queue + Redis
- Socket.IO

## Run
```bash
cd server
npm install
cp .env.example .env
npm run dev
```

API base: `http://localhost:5000/api/v1`

## Key Features
- Role-based access: `admin`, `shelter_staff`, `adopter`
- Shelter-scoped permissions and context checks
- Pet lifecycle and transfer workflows
- Foster assignment and federation-wide placement cap checks
- Shelter-group messaging with conversation handoff and sender attribution
- Medical records and vet sign-off flow
- Idempotent email delivery using outbox + dedup keys
- Optimistic locking support for concurrent application reviews

## Recent Reliability Updates
- **Email idempotency (outbox pattern)**
  - Added durable email outbox records with unique dedup keys
  - Queue worker claims pending items and skips already-sent records
  - Prevents duplicate adopter emails after retries/crash recovery
- **Optimistic locking for application review**
  - `PATCH /applications/:id/status` requires `expectedVersion`
  - Returns `409` conflict with latest server copy on version mismatch
- **Standalone Mongo compatibility**
  - Foster assign/take-back now auto-fallback when transactions are unsupported
  - Avoids `Transaction numbers are only allowed on a replica set member or mongos`

## Important Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`

### Applications
- `GET /applications`
- `GET /applications/:id`
- `PATCH /applications/:id/status` (uses optimistic locking via `expectedVersion`)

### Messaging (Conversation-based)
- `GET /messages/conversations`
- `POST /messages/conversations/start`
- `GET /messages/conversations/:conversationId/messages`
- `POST /messages/conversations/:conversationId/messages`
- `PATCH /messages/conversations/:conversationId/read`
- `PATCH /messages/conversations/:conversationId/handoff`

### Foster
- `GET /fosters`
- `PATCH /fosters/:id/status`
- `POST /fosters/assignments`
- `PATCH /fosters/assignments/:id/return`

## Notes
- For strict multi-document transactions, use MongoDB replica set.
- In local standalone Mongo, transaction-dependent foster flows still work using fallback logic.
