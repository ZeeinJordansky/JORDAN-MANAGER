# Security Specification for Mint Control Panel

## Data Invariants
- An authentication key document must have a valid VK ID, fullName, and avatarUrl.
- Keys are read-only for the client (to fetch profile info).
- Keys should not be listable to prevent scraping.

## The "Dirty Dozen" Payloads
1. Create a key from client (forbidden).
2. Update a key's linked VK ID (forbidden).
3. List all keys (forbidden).
4. Fetch a key by ID (allowed if they know the ID).
5. Delete a key from client (forbidden).
6. Create key with missing fields.
7. Create key with extra "admin" field.
8. Update createdAt.
9. Fetch non-existent key.
10. Query keys by VK ID (forbidden).
11. Spoof VK ID in creation.
12. Modify avatarUrl after creation.

## Rules Draft
- `match /auth_keys/{key}`
  - `allow get: if true;` // Publicly readable if you know the key to show confirmation screen
  - `allow list, create, update, delete: if false;` // Only server-side (or manual) creation/management
