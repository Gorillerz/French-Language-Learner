# Sync contract

The provider-neutral HTTPS contract between the app and whatever hosts the cloud (ADR 0001). `e2e/support/cloud-stand-in.ts` is the reference implementation that the tests run against; a real deployment must behave the same way.

The cloud is a store of opaque values for one account. It never sees a passphrase, a recovery code, a key, a table name, a row id, a `savedAt`, or any learning content.

## General rules

- Serve HTTPS only. The app refuses a non-HTTPS base URL unless the host is loopback, and it does not follow redirects.
- Bodies are JSON. Allow CORS from the app's origin for `GET`, `POST` and `PUT` with the `Authorization` and `Content-Type` headers.
- Every route except `/sign-up` and `/sign-in` takes `Authorization: Bearer <token>` and answers `401` when the token is missing or no longer valid. The app then asks the Learner to sign in again; local study carries on.
- A network failure, a timeout or any `5xx` means "cloud unreachable". The app reports the connection as lost and retries. Do not use `5xx` for a request the client should change.
- Any other status this contract does not list means the cloud refused the request. The app shows sync as failed, not the connection as lost, and retries.

## Sign-in

Ordinary account sign-in. It identifies the account and has no part in encryption, so resetting it restores nothing. How a host resets a password is up to the host, and it must leave the key bundle and records in place.

| Route | Body | Reply |
| --- | --- | --- |
| `POST /sign-up` | `{ email, password }` | `201 { token }`, or `409` if the email has an account |
| `POST /sign-in` | `{ email, password }` | `200 { token }`, or `401` |

## Key bundle

The data key wrapped by the passphrase and by the recovery code. It is what lets a second device join with the passphrase alone. The shape is defined by `KeyBundle` in `src/sync/crypto.ts`; the server stores it without interpreting it.

| Route | Body | Reply |
| --- | --- | --- |
| `GET /key-bundle` | | `200 { bundle, version }`, or `404` if none exists yet |
| `PUT /key-bundle` | `{ bundle, replaces }` | `200 { version }`, or `409` |

`replaces` is the `version` the client read, or `null` to create the first bundle. The server must answer `409` unless it matches the current version, so two devices can never silently overwrite one another's bundle. `version` is any value the server chooses.

## Records

```
Record:   { id: string, blob: string }
Stored:   { id: string, blob: string, cursor: number }
```

- `id` is opaque and stable: the same row has the same `id` on every device. It is a keyed hash, so the server cannot tell which row or table it stands for.
- `blob` is opaque ciphertext. Its size is the only thing the server can learn from it.
- `cursor` is a positive integer assigned by the server. It rises by at least one with every stored record, across the whole account.

| Route | Body | Reply |
| --- | --- | --- |
| `POST /push` | `{ records: Record[] }` | `200 { cursor }` |
| `GET /pull?since=<cursor>&limit=<n>` | | `200 { records: Stored[], cursor, hasMore }` |

**Push** replaces the stored record for each `id` and gives it a new `cursor`. The server keeps the latest push and must not try to choose between versions: it cannot read them. Conflicts resolve on the client, where the most recent decrypted `savedAt` wins; a client that holds a newer version than the one it pulled pushes its own again. Two versions with the same `savedAt` are ordered by their canonical JSON (keys sorted, compared by UTF-16 code unit) and the greater wins, so every client picks the same one, and a client holding that winner pushes it again too.

**Pull** returns the current record of every `id` whose `cursor` is greater than `since`, in rising `cursor` order, at most `limit` of them. The reply's `cursor` is the last one returned, or `since` when there are none. `hasMore` is true when more remain. `since=0` returns everything.

## Deletions

There are no deletions in the app yet. When there are, a deletion is an ordinary push: the blob's encrypted content says the row is deleted, so a tombstone looks like any other record and the server keeps it. Servers never need to know, and must never remove records of their own accord.

## Inside a blob

Decrypted, a blob is `{ table, row }`, where `row` is the local row with its `id` and `savedAt`. A tombstone will be `{ table, row: { id, savedAt }, deleted: true }`. AES-256-GCM with a fresh IV, and the record `id` as additional authenticated data, so a blob moved to another record fails to decrypt. A client ignores a blob it cannot authenticate and tells the Learner.

## Not protected

The server can see how many records exist, roughly how large each is, and when they change. It can also withhold records or replay an old blob of the same `id`: an old version loses most-recent-save and is pushed over, but a server that withholds data can only be detected by its absence on the other device.
