# Contributing to Verifact

Thank you for your interest in contributing to Verifact! This guide will help you get started with contributing code, documentation, or bug reports.

---

## Code of Conduct

This project follows standards of respect and professionalism. We expect all contributors to:
- Use welcoming and inclusive language.
- Be respectful of differing viewpoints and accept constructive feedback.
- Focus on what is best for the community and project integrity.
- Show empathy toward other community members.

---

## How to Contribute

### Reporting Bugs
1. Check existing [GitHub Issues](https://github.com/Seby2005/Verifact/issues) to ensure the bug hasn't already been reported.
2. If it hasn't been reported, open a new issue including:
   - A clear, descriptive title.
   - Exact steps to reproduce the issue.
   - Expected behavior vs. actual behavior.
   - Relevant screenshots or error trace logs.
   - Your environment details (Browser, OS, Node.js version).

### Suggesting Features
1. Open a new issue with the `feature-request` tag.
2. Describe the feature, the motivation behind it, and the value it adds for users.
3. Wait for feedback from maintainers before initiating implementation.

### Submitting Pull Requests

#### Local Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/<your-username>/Verifact.git
cd Verifact

# 3. Add the upstream remote
git remote add upstream https://github.com/Seby2005/Verifact.git

# 4. Install dependencies
npm install

# 5. Configure local environment variables
cp .env.example .env.local
# Fill in your local API keys in .env.local

# 6. Start the local development server
npm run dev
```

#### Development Workflow

1. **Create a branch from `dev`**:
   ```bash
   git checkout dev
   git pull upstream dev
   git checkout -b feature/<short-description>
   ```

2. **Implement your changes** respecting project code guidelines:
   - Strict TypeScript — no explicit `any`.
   - Vanilla CSS Modules — no Tailwind or external UI frameworks.
   - Component isolation — each React component in its own folder (`ComponentName/index.tsx` + `ComponentName.module.css`).
   - Named exports — avoid default exports (except Next.js `page.tsx` and `layout.tsx`).

3. **Write tests** for new features or bug fixes:
   ```bash
   npm test
   ```

4. **Verify quality checks pass**:
   ```bash
   npm run type-check    # Check TypeScript types
   npm run lint          # Run ESLint check
   npm test              # Run unit test suite
   npm run build         # Verify Next.js build compilation
   ```

5. **Commit using Conventional Commits**:
   ```bash
   git commit -m "feat: add screenshot preview modal"
   git commit -m "fix: resolve OCR timeout handling error"
   git commit -m "docs: update API setup instructions"
   git commit -m "test: add unit tests for scoring engine"
   ```

6. **Push and open a Pull Request**:
   ```bash
   git push origin feature/<short-description>
   ```
   Open a PR on GitHub targeting the `dev` branch.

#### Branch Naming Conventions

```text
feature/<task-id>-<description>   # e.g., feature/s1-2-screenshot-upload
fix/<description>                  # e.g., fix/ocr-timeout-error
docs/<description>                 # e.g., docs/update-contributing
test/<description>                 # e.g., test/scoring-unit-tests
refactor/<description>             # e.g., refactor/extract-scoring-logic
```

---

## Code Base Structure

```text
src/
├── app/            # Next.js App Router (pages and API route handlers)
├── components/     # Reusable React components
│   ├── ui/         # Design primitive components (Button, Input, Modal, Callout)
│   ├── verify/     # Verification tool components
│   ├── report/     # Report display components
│   ├── layout/     # Structural layout (Header, Footer)
│   └── auth/       # Authentication components
├── lib/            # Core business logic and utilities
│   ├── verification/  # 4-layer fact-checking algorithm & scoring engine
│   ├── ai/            # Gemini API client & prompt engineering
│   ├── ocr/           # Google Cloud Vision OCR client
│   ├── supabase/      # Supabase server/admin clients
│   └── utils/         # Structured logger, retry, & rate-limiting utilities
└── types/          # TypeScript database and domain type definitions
```

---

## Coding Guidelines

### TypeScript
- `strict: true` is strictly enforced.
- All public functions must have explicit parameter and return types.
- Use `interface` for object definitions and `type` for unions or primitives.

### CSS & Styling
- Vanilla CSS Modules exclusively (`.module.css` adjacent to the component).
- Shared design tokens and CSS variables defined in `src/app/globals.css`.
- Mobile-first approach: write mobile styles first, then extend via `@media (min-width: ...)`.

### Testing
- Unit tests reside in `tests/unit/`.
- E2E tests reside in `tests/e2e/`.
- Tests must describe behavior rather than implementation details.

---

## Questions & Contact

Feel free to open a [GitHub Issue](https://github.com/Seby2005/Verifact/issues) or participate in GitHub Discussions.

Thank you for helping make Verifact better! 🙏
