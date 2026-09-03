# DM3iQCM™

DM3iQCM is the internal codebase for **DM3iQ™ — Case Management Intelligence**, a production-oriented case-management platform in the DM3iQ™ product family. Its master workflow is Customer / Request → Case → Requirements → Tasks → Staff Work → Review → Completion.

## Getting started

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3003](http://localhost:3003). Other commands:

```bash
npm run build
npm run lint
npm run typecheck
```

### Authentication configuration

Copy `.env.example` to `.env.local` and supply the public values from the Supabase project's API settings:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Configure `http://localhost:3003/auth/callback` as an allowed Supabase redirect URL. Without these variables, the login UI remains available and clearly reports that Supabase is not configured; protected routes redirect to `/login`. Authentication supports password sign-in, email-code request and verification, cookie-backed sessions, callback exchange, protected routes, and sign-out. No case-management database schema is introduced by this milestone.

## Project structure

- `app/` — App Router pages and global visual system
- `components/` — reusable application, dashboard, and case presentation
- `data/` — structured representative local records
- `domain/` — permanent domain contracts and role policy
- `lib/` — reusable selectors, metrics, progress, and formatting
- `docs/` — product and architecture decisions

## Milestone status

DM3iQCM-01 establishes the application shell, navigation, role/domain model, dashboard, case register and workspace, Service Desk foundation, sample data, future-module routes, and the Supabase authentication scaffold. Case persistence, dynamic questions/rules, messaging, and integrations are explicitly reserved for later milestones.

See [docs/DM3IQCM-PRODUCT-FOUNDATION.md](docs/DM3IQCM-PRODUCT-FOUNDATION.md) for the permanent product foundation.
