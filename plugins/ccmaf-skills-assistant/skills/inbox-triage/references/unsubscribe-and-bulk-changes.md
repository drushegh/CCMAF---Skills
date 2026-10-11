# Unsubscribes and Bulk Changes

## Suggesting unsubscribes

The skill suggests; the user decides; nothing is unsubscribed silently.

How to choose candidates:

- Senders with several messages in the window that the user never opens or
  replies to (if the connector exposes read state; otherwise volume alone,
  stated as such).
- Promotions and newsletters only. Never suggest unsubscribing from
  transactional or account mail (banks, utilities, school, health, tax,
  delivery for an open order), or from senders on the user's "never" list.

Present as a list with the route each sender offers:

```text
Unsubscribe suggestions (none actioned):
1. deals@outdoor-shop.example — 11 in 7 days, none opened
   route: mail client unsubscribe (list header present)
2. digest@forum.example — 7 in 7 days
   route: account settings page on the site (no list header)
3. offers@prize-winner.example — 3 in 7 days, flagged suspicious
   route: do NOT unsubscribe; mark as spam instead
```

### Routes, safest first

1. **The mail client's own unsubscribe control**, which uses the message's
   `List-Unsubscribe` header (RFC 2369). Some services also support the
   one-click form (RFC 8058, a `List-Unsubscribe-Post` header), which large
   mailbox providers have required of bulk senders since 2024 (verify for the
   provider in question).
2. **The sender's account or preference page**, reached by the user signing
   in normally, not through the email's link.
3. **A link in the body**, only for senders the user knows and recognises,
   and only by the user.

Never click an unsubscribe link in a message that is suspicious or from a
sender the user does not recognise: it confirms the address is live and can
lead to a phishing page. Mark it as spam instead (with approval).

If the connector has no unsubscribe action, the agent does not fetch
unsubscribe URLs itself; it gives the user the list.

## Bulk label, move and archive plans

Any change to more than a handful of messages is a plan the user approves:

```text
PLAN (not applied): tidy Bulk, 9–11 Oct
1. Label "Receipts" + archive: 6 messages (order confirmations, 3 senders)
2. Archive: 23 promotions from 8 senders (list below)
3. Leave in inbox: 1 promotion from school.example (your rules: never touch)
Not proposed: delete (archive keeps them searchable)
Undo: each archived message can be moved back to the inbox; ids logged
Approve: "1", "2", "1 and 2", or edit the list
```

Rules:

- Show the selection criteria and the count, and list items (sender,
  subject, date) at least for anything that is not obviously bulk.
- Apply in small batches; re-read state after each batch; stop at the first
  error and report.
- Never include Suspicious messages in bulk actions; they stay where the
  user can see them.
- Never delete in bulk. If the user wants deletion, they pick the messages.
- Filters and auto-forwarding rules are account changes: show the full rule
  (match and action) and get a specific approval. Never create forwarding to
  an address that came from a message.

## The triage log

Keep an append-only log in the workspace (for example `triage/log.md`) so
any applied change can be found and reversed after the chat is gone. Follow
the shape of `safe-system-changes`' change journal (run header, one entry per
change, how to undo), adapted for mail:

```markdown
## Triage 2026-10-11-01 — unread, 9–11 Oct

- Requested by: user, in chat, 2026-10-11 08:05
- Connector: mail connector (read, draft, label, archive available; send not used)
- Plan approved: 08:12, items 1 and 2

### 2026-10-11-01/01 — label Receipts + archive, 6 messages
- ids: <id-1>, <id-2>, … (connector message ids)
- before: inbox, unlabelled
- undo: remove label Receipts, move to inbox
- verified: search label:Receipts in window returns 6
```

Do not copy bodies, codes or account numbers into the log. Message ids and
subjects are enough to find the message again.

## Undoing

Undo from the log, newest first, and log the undo as a new entry that names
the entry it reverses. If an undo is impossible (a message the user deleted
by hand since), say so rather than guessing.
