# Users, UAC and access control

## Local users and groups

```powershell
Get-LocalUser | Select-Object Name, Enabled, LastLogon, PrincipalSource
Get-LocalGroupMember -Group Administrators
whoami /groups       # current token, including whether elevated
whoami /priv
```

`PrincipalSource` distinguishes `Local`, `MicrosoftAccount`, `ActiveDirectory`
and `AzureAD` (Entra ID). The `Microsoft.PowerShell.LocalAccounts` module is
documented for Windows PowerShell 5.1 and is not available in 32-bit
PowerShell on 64-bit Windows; if a PowerShell 7 session cannot load it, run
the command in `powershell.exe` or use `net user` / `net localgroup`, which
work everywhere.

### Account hygiene rules

- The daily account should ideally be a **standard user**, with a separate
  local administrator used only for elevation prompts. At minimum, keep the
  number of administrators to the people who need it.
- Keep the built-in `Administrator` account **disabled** (the default). Do
  not enable it as a shortcut around UAC.
- Never create accounts with blank or example passwords. Let the user type
  passwords themselves (`Read-Host -AsSecureString`); never put a password
  in a script, journal or chat.
- Removing someone from `Administrators` can lock them out of their own
  tasks — confirm there is still at least one working admin account before
  the change, and test it.

```powershell
# Add a standard local account (user types the password)
$pw = Read-Host -AsSecureString -Prompt 'New password'
New-LocalUser -Name 'example.user' -Password $pw -FullName 'Example User' -WhatIf

# Group membership change (journal before/after Get-LocalGroupMember output)
Add-LocalGroupMember -Group 'Administrators' -Member 'example.user' -WhatIf
Remove-LocalGroupMember -Group 'Administrators' -Member 'example.user' -WhatIf

# Disable rather than delete
Disable-LocalUser -Name 'example.user'
```

Deleting a user does not delete their profile folder under `C:\Users`, and
deleting the profile loses their data — both are separate, confirmed
removals after a backup.

## UAC

User Account Control splits an administrator's sign-in into a filtered
(standard) token and a full token. The consent prompt is the security
boundary that stops software silently using admin rights.

- **Never** turn UAC off (`EnableLUA = 0`) or lower the slider to "never
  notify". It also breaks Store apps and some security features.
- **Read** the configuration if asked, without changing it:
  `Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' |
  Select-Object EnableLUA, ConsentPromptBehaviorAdmin, PromptOnSecureDesktop`.
- Check whether the current shell is elevated:

```powershell
$id = [Security.Principal.WindowsIdentity]::GetCurrent()
([Security.Principal.WindowsPrincipal]$id).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
```

- Elevate a single command through the normal prompt:
  `Start-Process pwsh -Verb RunAs -ArgumentList '-NoProfile','-Command','Get-Service'`.
- Windows 11 24H2 and later include `sudo` (Settings > System > For
  developers). It is off by default; only use it if the user has enabled it,
  and it still shows a UAC prompt.
- Scripts that need elevation declare `#Requires -RunAsAdministrator` so they
  fail clearly instead of half-working.

## File and folder permissions (ACLs)

```powershell
icacls "D:\Shared\Projects"                    # read
Get-Acl "D:\Shared\Projects" | Format-List     # read, object form

# Before any change: save the ACLs (recursively) for revert
icacls "D:\Shared\Projects" /save "$env:USERPROFILE\journal\projects-acl.txt" /t /c

# Grant modify to one account, inherited by subfolders and files
icacls "D:\Shared\Projects" /grant "example.user:(OI)(CI)M"

# Revert (note: /restore takes the PARENT folder of the saved path)
icacls "D:\Shared" /restore "$env:USERPROFILE\journal\projects-acl.txt" /c
```

Rules:

- Grant to groups where possible, not to individual users.
- Never "fix" access with `Everyone:(F)` or by granting the user full control
  of `C:\Windows`, `C:\Program Files` or another user's profile.
- `takeown` changes ownership permanently and is hard to undo precisely;
  only with explicit confirmation, after `icacls /save`, on the narrowest
  path.
- Inheritance (`(OI)(CI)`) and explicit deny entries explain most
  "it should work but doesn't" cases; read `icacls` output carefully before
  adding more entries.

## Security log events worth knowing (admin view)

The `Security` log needs elevation to read. Useful IDs: 4624 successful
logon, 4625 failed logon, 4720 user account created, 4726 deleted, 4732
member added to a security-enabled local group, 4740 account locked out.
Interpreting patterns of these as an attack belongs to
`windows-security-hygiene` / `incident-response`.
