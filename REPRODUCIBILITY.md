# Build & Test Reproducibility

This document describes the measures taken to ensure reliable, reproducible builds and tests from a clean environment.

## Environment Requirements

**Minimum versions:**
- Node.js: >=20.0.0
- npm: >=10.0.0

These are enforced in `package.json` via the `engines` field and `.npmrc` with `engine-strict=true`.

## Reproducibility Measures

### 1. **Strict Dependency Management**

**`.npmrc` Configuration:**
- `engine-strict=true` - Prevents installation with incompatible Node/npm versions
- `save-exact=true` - Ensures exact versions in package.json lock files
- `package-lock.json` - Committed to git for identical install results

**Result:** Clean `npm install` will always produce the same dependency tree.

### 2. **Configuration Stability**

**Vite Configuration (`vite.config.ts`):**
- Explicit `chunkSizeWarningLimit: 1500` - No confusing warnings about bundle size
- Content-hash filenames - Ensures cache-busting with artifact changes
- `emptyOutDir: true` - Clean builds without stale artifacts
- Consistent module sorting - Reproducible bundle generation

**Result:** Build artifacts are consistent across machines and environments.

### 3. **Build Artifact Cleanup**

**Committed `.gitignore` entries:**
- `vite.config.ts.timestamp-*` - Temporal Vite build artifacts never committed
- `dist/` and `build/` directories - Build outputs never committed
- `.env` files - Secrets never committed (only `.env.example` is tracked)

**Result:** No machine-specific or build-time artifacts in the repository.

### 4. **Test Isolation & Stability**

**Test Setup (`src/test/setup.ts`):**
- Clears `localStorage` and `sessionStorage` after each test
- Resets all mocks to prevent cross-test pollution
- Unstubs all environment-level mocks

**Vitest Configuration:**
- `environment: 'jsdom'` - Consistent browser simulation
- `clearMocks: true` - Automatic mock cleanup
- `passWithNoTests: false` - Fails if test files exist but have no tests

**Result:** Tests run reliably in isolation, regardless of execution order.

### 5. **TypeScript Strictness**

**`tsconfig.json` Settings:**
- `strict: true` - Full type checking enabled
- `isolatedModules: true` - Each file is independently compilable
- `noUnusedLocals` and `noUnusedParameters` - No dead code hiding issues
- Source-root relative paths with `@/*` alias - Explicit imports prevent resolution accidents

**Result:** TypeScript catches reproducibility issues at compile-time.

### 6. **Environment Variable Defaults**

**API Configuration (`src/app/api/config/apiConfig.ts`):**
- Defaults to `mock` adapter mode if `VITE_SERVICE_ADAPTER_MODE` is undefined
- Safe defaults for all environment variables
- Proper validation of numeric and URL configuration values

**Result:** The app runs without requiring `.env.local` setup for development/testing.

## Verification Commands

```bash
# Type checking
npm run typecheck

# Run tests once
npm test

# Run tests in watch mode (dev only)
npm run test:watch

# Production build
npm run build

# Preview production build locally
npm run preview

# Full verification (recommended before commit)
npm run verify
```

## Clean Environment Testing

To verify reproducibility from a clean state:

```bash
# 1. Remove node_modules and lock file
rm -r node_modules package-lock.json

# 2. Fresh install with engine strict checking
npm install

# 3. Run full verification
npm run verify
```

If all commands succeed, the build is reproducible from a clean environment.

## Known Non-Frontend Limitations

The following limitations are **not** addressed in this optimization (they require backend/infrastructure changes):

- **Backend API availability** - Tests default to mock mode; API mode requires a running backend
- **Database production migrations** - The backend currently uses SQLite (`DATABASE_URL="file:./dev.db"`) and has no committed Prisma migrations yet. PostgreSQL is the intended production target, but that migration is planned, not implemented.
- **Authentication credentials** - `.env.local` required for real authentication flows
- **CDN or external resource availability** - Dependent on infrastructure

Local `.db` files are ignored and must not be committed. The current local database flow may use Prisma Client generation and the existing SQLite setup, but `prisma db push` is not production-safe. Production should eventually use PostgreSQL, committed migrations, and `prisma migrate deploy`.

## Maintenance

When modifying the project:

1. Keep `package-lock.json` committed (don't use `npm install --no-save`)
2. Never commit build artifacts (they're in `.gitignore`)
3. Never commit `.env` or `.env.local` files
4. Run `npm run verify` before committing
5. Keep strict TypeScript settings enabled
6. Ensure all tests pass in isolation (`npm test`)

## References

- [Vite Build Documentation](https://vite.dev/guide/build.html)
- [Vitest Configuration](https://vitest.dev/config/)
- [TypeScript Compiler Options](https://www.typescriptlang.org/tsconfig)
- [npm Engine Strict](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#engines)
