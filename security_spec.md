# Security Specification for VK Bot Dashboard

## Data Invariants
- A message must have a valid `userId` and `timestamp`.
- `fromBot` must be a boolean.

## The Dirty Dozen Payloads
1. Message without `userId`.
2. Message with non-integer `timestamp`.
3. Message with missing `text`.
4. Unauthorized user trying to read messages.
5. Unauthorized user trying to write messages.
6. Message with a very long `text` (e.g. 1MB).
7. Message with `fromBot` as a string.
8. Message with `userId` as a string.
9. Trying to delete a message (not allowed).
10. Trying to update a message's `timestamp`.
11. Trying to inject a ghost field `isVerified`.
12. Trying to write a message with a future timestamp.

## Rules Draft
I will use a simple rule: only the admin (user email) can read/write to the messages collection.
Admin email: sirotininoleg5@gmail.com
