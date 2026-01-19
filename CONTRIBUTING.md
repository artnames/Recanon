# Contributing to Recanon

Thank you for your interest in contributing to Recanon! This document outlines guidelines for contributing to the project.

---

## Getting Started

### Prerequisites

- Node.js 18+ (recommend using nvm)
- npm or bun

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/recanon.git
cd recanon

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Environment Configuration

Create a `.env.local` file (not committed):

```env
VITE_CANONICAL_RENDERER_URL=https://nexart-canonical-renderer-production.up.railway.app
```

Or use the UI's "Edit" button to set a renderer URL via localStorage.

---

## Architecture Rules

### ⚠️ Critical: No Client-Side Certified Logic

The most important rule for this codebase:

> **All certified execution logic MUST go through the Canonical Renderer.**

This means:

- ❌ No browser-based PRNG for certified results
- ❌ No client-side hashing that claims to be "certified"
- ❌ No mock fallbacks for certified execution
- ✅ All certified renders → `POST /render` to canonical renderer
- ✅ All certified verifications → `POST /verify` to canonical renderer

If the canonical renderer is unreachable, the UI must **fail loudly**—never silently fall back to local execution.

### Module Boundaries

```
src/
├── certified/           # All canonical renderer interaction
│   ├── canonicalConfig.ts   # URL resolution
│   ├── canonicalClient.ts   # HTTP client
│   └── engine.ts            # High-level API
├── components/          # React UI (no SDK imports)
├── types/               # TypeScript interfaces
└── api/                 # Mock API layer for demos
```

**Rule**: React components in `src/components/` must NOT import from `@nexart/codemode-sdk` directly. All SDK access goes through `src/certified/engine.ts`.

---

## Pull Request Guidelines

### Before Submitting

1. **Run tests**: `npm test`
2. **Check types**: `npm run typecheck` (if available)
3. **Test manually**: Generate and verify bundles in the UI
4. **No dead code**: Remove TODOs, commented code, unused imports

### PR Description

Include:

- What the change does
- Why it's needed
- How to test it
- Screenshots (for UI changes)

### Commit Messages

Use conventional commits:

```
feat: add support for custom canvas dimensions
fix: correct hash comparison for loop mode
docs: update quickstart guide
refactor: extract renderer health check to hook
```

---

## Adding New Verification Domains

Recanon is designed to support multiple domains (finance, science, gaming, etc.). To add a new domain:

### 1. Define Domain-Specific Parameters

In `src/types/`, create domain interfaces:

```typescript
// src/types/scienceDomain.ts
export interface ScienceExperimentVars {
  temperature: number;     // VAR[0]
  pressure: number;        // VAR[1]
  concentration: number;   // VAR[2]
  // ...
}
```

### 2. Create Domain Visualization

Write a Code Mode program that renders domain-specific visualizations:

```typescript
const SCIENCE_VIZ_CODE = `
function setup() {
  createCanvas(800, 600);
}

function draw() {
  // Visualize experiment based on VAR[0-9]
}
`;
```

### 3. Add Domain UI Components

Create components in `src/components/domains/`:

```
src/components/domains/
├── finance/
├── science/    # New domain
└── gaming/
```

### 4. Register Domain in Navigation

Update `Sidebar.tsx` to include the new domain route.

---

## Code Style

- TypeScript strict mode
- Functional components with hooks
- Tailwind CSS for styling (use semantic tokens from `index.css`)
- No inline styles unless absolutely necessary

### Imports

```typescript
// External packages first
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

// Internal components
import { Button } from '@/components/ui/button';

// Types
import type { CertifiedArtifact } from '@/types/certifiedArtifact';

// Certified layer (only in certified/ or designated boundary modules)
import { renderCertified } from '@/certified/canonicalClient';
```

---

## Questions?

Open an issue for:

- Bug reports
- Feature requests
- Architecture discussions

For security issues, please email security@example.com directly.

---

Thank you for contributing to verifiable, deterministic computation! 🛡️
