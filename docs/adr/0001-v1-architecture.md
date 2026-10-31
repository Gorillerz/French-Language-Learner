# ADR 0001: V1 client-first architecture

The V1 spec (#11) sets product behaviour but names no stack. The app is a private, single-Learner PWA whose data must be readable only on the Learner's devices, so we build a client-first app in which every feature works against local storage, and the cloud only ever holds ciphertext.

## Decisions

- **Client**: TypeScript (strict), React, Vite, and `vite-plugin-pwa` for the manifest and service worker. Plain CSS. No client-side router dependency unless a ticket needs one.
- **Local store**: IndexedDB through Dexie. It is the source of truth for the UI. Every user-editable or synced row carries a stable id and a `savedAt` timestamp, so that #17 can add sync without reshaping data.
- **Built-in content**: curated vocabulary, grammar, and questions ship as typed data in the bundle and are seeded into the local store on first run. Built-in ids are stable across devices so that seeded rows do not duplicate on sync.
- **Testing**: Playwright is the one test seam. Tests drive Learner-visible behaviour against the production build served locally, with controlled stand-ins for cloud sync and AI. Vitest is used only for deep pure logic, such as review priority and crypto, where browser tests would be a poor fit.
- **Service configuration**: the app reads the cloud and AI base URLs from build-time config, so tests can point them at stand-ins.
- **Encryption**: WebCrypto only. A random data key encrypts each record with AES-GCM. That data key is wrapped twice, by keys derived from the passphrase and from the recovery code (PBKDF2-SHA-256, at least 600,000 iterations, per-wrap random salt). The wrapped key bundle is stored in the cloud so a second device needs only the passphrase. Plaintext keys and passphrases never leave the device.
- **Sync**: record-level encrypted blobs over a small provider-neutral HTTPS contract (sign-in, key bundle, push, pull since cursor). The cloud sees record ids, a monotonic server cursor, and ciphertext. Conflicts resolve on the client, most recent `savedAt` wins. Deletions sync as tombstones.
- **AI**: direct HTTPS from the browser to OpenRouter's chat completions API, using a Learner-supplied API key held in encrypted settings. There is no AI proxy to host. Every call sits behind one module that takes an explicit Learner action and a minimal payload.

## Consequences

- No specific cloud host is chosen. The sync contract is implemented by the test stand-in; pointing a real deployment at it is a separate decision.
- Each device pays a PBKDF2 unlock cost, which is acceptable for a passphrase entered rarely.
- Timestamps come from device clocks, so most-recent-save can misorder edits under clock skew. That is accepted for a single Learner.
