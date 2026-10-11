# Risk rubric and findings report

The rubric turns evidence into a rating the user can act on. It is a
structured judgement, not an oracle: show the factors so the user (or a
reviewer) can disagree with a specific point.

## Ratings

| Rating | Meaning | Default action |
|---|---|---|
| **Informational** | Expected, explained, nothing notable | List in appendix only |
| **Low** | Minor oddity with a plausible benign explanation | Mention; no action |
| **Medium** | Several weak signals, or one moderate signal unexplained | Ask the user if they recognise it; Defender custom scan; watch |
| **High** | Strong signal(s), or moderate signals that stack | Propose reversible containment; full or offline scan |
| **Critical** | Defender detection, or clear signs of compromise | Let Defender act; stop and escalate (`incident-response`) |

## Factor scoring

Score each entry by adding the factors that apply; hidden window, encoding
and remote execution are separate factors and stack. Thresholds: 0 to 1
Informational, 2 to 3 Low, 4 to 5 Medium, 6 or more High. Any **Critical
trigger** overrides the score.

| Factor | Points |
|---|---|
| `HashMismatch` signature status | +4 |
| `NotTrusted` or `UnknownError` signature | +3 |
| `NotSigned` executable (not script/data) in a temp, download or odd path | +3 |
| `NotSigned` executable in a per-user or ProgramData path | +1 |
| Name imitates a Windows component, or a system name in a non-system folder | +3 |
| `OriginalFilename` differs from the on-disk name for a system tool | +2 |
| Launcher runs with a hidden window (`-w hidden`, `-WindowStyle Hidden`) | +2 |
| Encoded or obfuscated command line (`-enc`, `-EncodedCommand`, base64 blobs) | +2 |
| Downloads and executes remote content (decoded command fetches a URL and runs it) | +4 |
| Script host or LOLBin launcher (`mshta`, `regsvr32`, `rundll32` on a user-path DLL, `wscript`) | +2 |
| WMI permanent consumer the user cannot attribute | +3 |
| Winlogon `Userinit`/`Shell` modified, IFEO `Debugger`, `AppInit_DLLs` set | +4 |
| Defender exclusion covering the item's path that the user did not create | +4 |
| Entry re-appeared after being disabled | +3 |
| Random-looking file or folder name | +1 |
| Hidden/System attributes on a file in a user folder | +1 |
| Target file missing (orphaned entry) | +0, note as housekeeping |

Mitigating evidence (subtract, but never below zero):

| Factor | Points |
|---|---|
| `Valid` signature from a publisher that matches the product and path | -2 |
| User recognises and installed it, and path and signer match | -2 |
| Installed program listed in Settings > Apps with matching publisher | -1 |
| `MpCmdRun -TrustCheck` reports trusted | -1 |

**Critical triggers:** any active or recent Defender detection
(`Get-MpThreatDetection`) for the item; Defender found disabled or tampered and
the user did not do it; ransom notes or mass file renaming; unknown accounts in
the local Administrators group.

## Evidence requirements

A rating without evidence is a guess. Each finding row must carry:

- **Where:** exact autostart location (key and value name, task path, service
  name, WMI object name, folder).
- **What:** the full command line and the resolved image path.
- **Signature:** `Status`, signer subject, catalogue or embedded if known.
- **Identity:** SHA-256, size, version info, timestamps.
- **Defender:** custom scan result for the file, any detection history.
- **Score:** the factors applied, with points, and the total.
- **Confidence:** high, medium or low, with one line on what would change it.

## Writing for the user

- Lead with the overall picture in one or two sentences ("Nothing alarming;
  two items worth a look").
- Explain each Medium or higher item in plain language: what it is, why it
  stood out, what we recommend, what happens if they do nothing.
- Never state certainty you do not have. "This looks like a leftover from an
  uninstalled printer tool" is better than "this is safe".
- Say what the review did not cover (kernel rootkits, firmware, browser
  internals, other user profiles not checked, items you lacked rights to
  read).

## Findings report template

```markdown
# Security hygiene review — <machine name> — <date>

## Summary
<1-3 sentences: overall picture and the top recommendation.>

## Scope and limits
- Checked: <locations, profiles, elevated yes/no, Defender quick/custom scan>
- Not checked: <what and why>
- Online hash lookups: <not used | used with consent for N hashes>
- This is a hygiene review, not a guarantee that the machine is clean.

## Defender status
Real-time protection: <on/off> · Signatures: <date> · Tamper protection: <state>
Last quick scan: <date> · Detections in history: <none | list>

## Findings
| # | Rating | Location | Entry | Image | Signature | Score | Recommendation |
|---|--------|----------|-------|-------|-----------|-------|----------------|

## Detail for Medium and above
### <#> <entry name> — <rating>
- Where: ...
- Command line: ...
- Signature: ...  SHA-256: ...
- Factors: ... (total N)
- Why it matters: ...
- Recommendation: ...
- Undo if contained: ...

## Changes made
<none | journal references with undo commands>

## Next steps
<re-check after reboot, offline scan, ask a professional, etc.>
```
