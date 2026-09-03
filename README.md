# DM3iQCM™

DM3iQCM™ — Case Management Intelligence — is a production-oriented case-management platform in the DM3iQ™ product family. Its master workflow is Customer / Request → Case → Requirements → Tasks → Staff Work → Review → Completion.

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

## Project structure

- `app/` — App Router pages and global visual system
- `components/` — reusable application, dashboard, and case presentation
- `data/` — structured representative local records
- `domain/` — permanent domain contracts and role policy
- `lib/` — reusable selectors, metrics, progress, and formatting
- `docs/` — product and architecture decisions

## Milestone status

DM3iQCM-01 establishes the application shell, navigation, role/domain model, dashboard, case register and workspace, Service Desk foundation, sample data, and future-module routes. Authentication, persistence, dynamic questions/rules, messaging, and integrations are explicitly reserved for later milestones.

See [docs/DM3IQCM-PRODUCT-FOUNDATION.md](docs/DM3IQCM-PRODUCT-FOUNDATION.md) for the permanent product foundation.
