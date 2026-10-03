# Theory

A tiny property-based testing library in TypeScript, built step by step to understand [Minithesis](https://github.com/DRMacIver/minithesis) from first principles.

The core idea is to record the choices that generate test inputs, replay those choices to reproduce failures, and shrink the choices to find simpler counterexamples.

## Progress

- Random bounded choices and choice recording.
- Prefix-based generation and strict replay.
- Invalid and overrun handling.
- Single-execution classification: passed, failed, invalid, or overrun.
- Automated tests for choice handling.

The search runner and shrinker are next.

## Getting started

Requires Node.js 24 and pnpm. Run:

```sh
pnpm install
pnpm dev        # Run the example in src/theory.ts
pnpm test       # Run automated tests
pnpm typecheck  # Check TypeScript types
pnpm build      # Compile into dist/
```

The library lives in `src/theory.ts`, with tests in `src/theory.test.ts`.
