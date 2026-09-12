# Data-layer reasoning

No database access, so this is entirely based on what I could observe.

`ask-unauthenticated` returns `{message, session_id}`, with a UUID created on first contact. The suggestions API returns CMS-style rows with `id`, `title`, `prompt`, `order`, `enabled`, `created_at`, and `updated_at`. Registration asks for email + password and says a verification email will be sent.

## Expected writes

**(a) A message to the agent** probably writes to a `sessions` table (`id` UUID PK, `user_id` nullable FK, `created_at`, `last_active_at`) and a `messages` table (`id`, `session_id` FK, `role` enum[user|agent], `content`, `suggested_topic_id` nullable FK, `created_at`).

`user_id` needs to be nullable because pre-login anonymous sessions clearly exist. I’d model one row per message instead of one wide row per Q&A pair. It fits a real conversation history better and keeps querying simple, even if it means two writes per exchange.

One thing I confirmed while testing: pre-login, `session_id` changes on every message, even in the same tab without a reload. Three messages gave me three different UUIDs. So anonymous conversations probably aren’t grouped server-side at all; each message may effectively be its own session, with multi-turn context rebuilt client-side. I’d want to confirm that before trusting query 3 below, because that query assumes messages share a `session_id`.

**(b) Account creation** is a little clearer from DevTools. Login calls Google’s `identitytoolkit.googleapis.com/accounts:signInWithPassword` directly, so Permission.ai is using Firebase Auth rather than handling credentials itself.

That means their `users` row likely stores a `firebase_uid` (Firebase’s `localId`) instead of a `password_hash`, because Google owns the credential. A `verification_tokens` row (`id`, `user_id` FK, `token`, `expires_at`, `used_at` nullable) may support the verification-email flow, although Firebase may be handling that too.

## Verification queries

```sql
-- 1. Messages pointing to a session that does not exist
SELECT m.id, m.session_id
FROM messages m
LEFT JOIN sessions s ON s.id = m.session_id
WHERE s.id IS NULL;

-- 2. A user somehow verified before the account was created
SELECT id, email, created_at, email_verified_at
FROM users
WHERE email_verified_at IS NOT NULL
  AND email_verified_at < created_at;

-- 3. User messages with no agent reply in the same session
SELECT u.id, u.session_id, u.created_at
FROM messages u
WHERE u.role = 'user'
  AND NOT EXISTS (
    SELECT 1
    FROM messages a
    WHERE a.session_id = u.session_id
      AND a.role = 'agent'
      AND a.created_at >= u.created_at
  );
```

## Downstream pipeline integrity check

I’d add a daily row-count reconciliation between the source `messages` table and the analytics warehouse for the same window.

If fewer rows keep landing in the warehouse than the source produced, that points to a silent pipeline drop. Cheap, high-signal, and worth running before trusting any dashboard built on top of it.
