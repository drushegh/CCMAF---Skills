# GDPR-minded habits (EU and Irish framing)

Practical habits, not legal advice. For anything that might create legal
obligations, point the user to the Data Protection Commission (Ireland's
regulator, dataprotection.ie) or their own national authority, and to
`secure-development` (`references/gdpr.md`) for software engineering
obligations.

## The household exemption and where it stops

GDPR Article 2(2)(c): the Regulation does not apply to processing "by a
natural person in the course of a purely personal or household activity".
A personal notes vault about the user's own life, family and friends is
normally inside this exemption.

It stops applying, or becomes doubtful, when:

- the user runs a **side business, freelance work, a club, a charity, a
  residents' association or a school committee** from the same vault
  (members' or customers' data is then held for that activity);
- records about others are **published or shared** beyond the household
  (a public notes site, a shared drive with a wider group);
- the vault is used for **work** (the employer's data and policies apply);
- the user records or monitors people outside the home (for example a
  camera covering a public footpath; courts have treated that as outside
  the exemption, verify the current position).

When any of these apply: separate that activity's data into its own
folder or vault, keep only what the activity needs, and suggest the user
reads the regulator's guidance for small organisations. Do not attempt a
compliance programme inside the personal vault.

Even inside the exemption, the habits below are good practice: they are
what keeps a personal vault from becoming a liability when it leaks.

## Habits that carry over from GDPR principles

| Principle (Art. 5) | Habit in a personal vault |
|---|---|
| Data minimisation | Store references instead of values; take the fact, not the document |
| Purpose limitation | A people note exists to remember what you need for that relationship, not everything known |
| Storage limitation | Retention for inbox captures and logs; review on project close |
| Accuracy | Date-stamp facts about people ("phone number as of 2026-03"); correct rather than pile up |
| Integrity and confidentiality | Encrypted disks, strong phone lock, one sync mechanism, no secrets in the vault |
| Accountability | A short `README.md` in the workspace saying what is kept, where, and how it syncs |

## Other people's data

- Write about people as you would if they might read it.
- Keep special-category details about others (health, beliefs,
  orientation) out unless the user has a clear reason, such as caring
  responsibilities, and asks.
- When someone asks the user to forget something ("please don't keep my
  number"), help the user find and remove every copy (search procedure in
  `redaction-procedure.md`).
- Group chats, forwarded mail and shared documents contain third parties'
  data; extract the user's task, not the whole conversation.

## When the user exercises their own rights against an organisation

The assistant can help draft and track requests to companies and public
bodies. Rules of thumb (verify for the specific case):

- **Access request (Art. 15):** the user can ask an organisation for a copy
  of their personal data. Under Art. 12(3) the organisation must respond
  without undue delay and within one month of receipt, extendable by two
  further months for complex or numerous requests, with the user told of
  the extension within the first month.
- **Rectification (Art. 16), erasure (Art. 17), restriction (Art. 18),
  portability (Art. 20), objection (Art. 21)** follow the same time limits.
  Erasure is not absolute; organisations can refuse where they have a legal
  obligation to keep data (for example tax records).
- **Drafting:** state who the user is, what they ask for, the article,
  and how to reply; send through the organisation's published data
  protection contact. The user sends it; the assistant never sends on its
  own (`inbox-triage` rules).
- **Tracking:** log the date sent and the response deadline as a
  commitment (`commitments-tracker`), and file the reply.
- **Complaint:** if the organisation does not respond, the user can
  complain to the Data Protection Commission (Ireland) or the authority
  where they live or work.
- **Identity checks:** organisations may ask for proof of identity. Send
  the minimum (a redacted copy where accepted), and never file the ID copy
  in the vault.

Draft letters stay in the vault without the user's ID numbers or account
details beyond what the letter needs.

## When others ask the user (or the user's small activity) for their data

If the user runs a club or side business and receives an access or
erasure request, that is an obligation of the activity, not a vault
housekeeping task. Help them find the data and note the deadline, and
point them to the regulator's guidance; do not give a legal view on
whether an exemption applies.

## Irish specifics worth knowing (verify current details)

- The Data Protection Act 2018 gives further effect to GDPR in Ireland;
  the Data Protection Commission is the supervisory authority.
- The PPS number is a sensitive identifier; its use by organisations is
  restricted by social welfare legislation. Do not record it in notes.
- Health data handling for health services has its own rules; for the
  user's own notes, the "only on request" rule here applies.

## Phrases to use with the user

- "I'll note that the passport renewal is due in March; the number itself
  is safer left in the passport or your password manager."
- "This email includes your full card number. I've left it out of the note
  and kept just the last four digits."
- "Your club's member list would be better in its own folder, separate
  from your personal notes; that also makes it easier if a member ever asks
  what you hold about them."
