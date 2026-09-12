# Data-layer reasoning

No database access, so this is based entirely on what I could observe.

`ask-unauthenticated` returns `{message, session_id}` with a UUID. The suggestions API returns CMS-style rows with `id`, `title`, `prompt`, `order`, `enabled`, `created_at`, and `updated_at`. Registration asks for email + password and says a verification email will be sent.

## Expected writes

**(a) A message to the agent** probably writes to a `sessions` table (`id` UUID PK, `user_id` nullable FK, `created_at`, `last_active_at`) and a `messages` table (`id`, `session_id` FK, `role` enum(user|agent), `content`, `suggested_topic_id` nullable FK, `created_at`).

`user_id` needs to be nullable because anonymous pre-login sessions exist. I’d keep one row per message rather than one wide Q&A row because it fits a real chat history better.

One thing I confirmed while testing: pre-login, `session_id` changes on every message, even in the same tab. Three messages gave me three UUIDs. So anonymous messages may not actually share a server-side session, and I’d confirm that before trusting query 3 below.

**(b) Account creation:** DevTools shows login calling Google’s `identitytoolkit.googleapis.com/accounts:signInWithPassword`, so Permission.ai is using Firebase Auth.

Their `users` row likely stores a `firebase_uid` (Firebase `localId`) instead of a `password_hash`. Verification may also be delegated to Firebase rather than a local `verification_tokens` table.

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

I’d reconcile daily `messages` row counts between the source and analytics warehouse. If fewer rows consistently land in the warehouse, that points to a silent pipeline drop.

