# SSH Hygiene for a Home Server

SSH is the front door to every box in the lab. At home the threat is less a
targeted attacker than an opportunistic scanner finding a forwarded port 22
with password login on, or a reused key on a lost laptop. The goal is simple:
keys only, one key per client device, no root, nothing reachable from the
internet, and a way back in if you break it.

Server-side depth (fail2ban tuning, PAM, CIS hardening) belongs to
`linux-administration`. This file is the home-scale set.

## Keys: one per client device

```bash
# On each client (laptop, desktop), once:
ssh-keygen -t ed25519 -a 100 -C "laptop-2026"
# Copy the public key to the server (asks for the password one last time):
ssh-copy-id -i ~/.ssh/id_ed25519.pub admin@homeserver.home.arpa
```

- **Ed25519** is the default choice; RSA keys of 3072+ bits only for very old
  devices that lack Ed25519.
- **A passphrase on the private key**, unlocked once per session by
  `ssh-agent` (or the OS keychain). An unencrypted key on a laptop is a
  password written on the lid.
- **One key per device, labelled with `-C`**, so a lost phone or a retired
  laptop is revoked by deleting one line in `~/.ssh/authorized_keys` on each
  server. Never copy one private key between devices.
- On Windows, the built-in OpenSSH client works the same way; `ssh-copy-id`
  is not shipped there, so append the public key to the server's
  `~/.ssh/authorized_keys` by hand (verify the client version on the
  machine).
- `home.arpa` is the domain reserved for home networks (RFC 8375); use it,
  or your router's local domain, rather than inventing a public-looking one.

Permissions the server insists on: `~/.ssh` is `700`, `authorized_keys` is
`600`, both owned by the user. Wrong permissions make sshd silently ignore the
key and fall back to password, which looks like "keys don't work".

## Client config saves mistakes

`~/.ssh/config` on each client:

```text
Host homeserver
    HostName homeserver.home.arpa
    User admin
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

Host nas
    HostName nas01.home.arpa
    User admin
    IdentityFile ~/.ssh/id_ed25519
    IdentitiesOnly yes

# Reach an internal box through the server, without exposing it:
Host pi-garage
    HostName 192.168.1.40
    User admin
    ProxyJump homeserver
```

`IdentitiesOnly yes` stops the client offering every key in the agent, which
otherwise trips `MaxAuthTries` on servers with many keys loaded.

## Server: harden with a drop-in, then prove it

Prefer a drop-in file to editing the vendor `sshd_config`; deleting the
drop-in is a clean undo. On Debian/Ubuntu, `sshd_config` includes
`/etc/ssh/sshd_config.d/*.conf` near the top (check the `Include` line on
your distribution before relying on it).

```text
# /etc/ssh/sshd_config.d/10-homelab.conf
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
AllowUsers admin
```

**The first value read wins** in `sshd_config`. Files are read in lexical
order, so a `50-cloud-init.conf` that sets `PasswordAuthentication yes` is
overridden by your `10-` file, but your setting would lose if it were named
`60-`. Some images ship such a file; look before assuming.

Apply in this order, under `safe-system-changes`:

1. Back up: `sudo cp -a /etc/ssh/sshd_config.d "$BK/sshd_config.d"`.
2. Confirm key login works **now**, from the device you will use, before
   turning passwords off.
3. Write the drop-in.
4. Validate: `sudo sshd -t` (syntax; no output means valid).
5. Read the effective config:
   `sudo sshd -T | grep -Ei 'passwordauth|permitroot|kbdinteractive|allowusers'`.
6. **Keep the current session open**, reload (`sudo systemctl reload ssh` on
   Debian/Ubuntu; the unit is `sshd` on RHEL-family and Arch).
7. Open a **new** terminal and log in. Only when that works, close the old
   session. Also confirm a password attempt is refused:
   `ssh -o PubkeyAuthentication=no -o PreferredAuthentications=password homeserver`
   should fail with `Permission denied (publickey)`.

Undo: delete the drop-in (or restore the backup), `sshd -t`, reload.

**Socket activation:** recent Ubuntu releases start sshd from `ssh.socket`,
so the listening port is set in the socket unit, not `Port` in
`sshd_config` (version-dependent, verify on the host with
`systemctl status ssh.socket`). Changing the port is rarely worth it at home
anyway; it reduces log noise, not risk.

## Remote access: a VPN, not a forwarded port

| Option | Notes |
|---|---|
| WireGuard on the router or the server | Free, fast, one UDP port forwarded; keys per device; you run it |
| Overlay mesh (Tailscale, Headscale self-hosted, NetBird) | No port forwarding; the hosted coordination services have free tiers, paid tiers are optional; Headscale keeps it fully self-hosted |
| Port-forwarded SSH | Avoid. If the user insists: key-only, `AllowUsers`, fail2ban (`linux-administration`), non-root, and they accept the log noise |

Never forward router ports to admin web UIs (Proxmox, the NAS, Portainer,
the router itself). Check what the router actually forwards; UPnP may have
opened ports nobody remembers. Disabling UPnP on the router is a change the
user makes, after you explain why.

## Lockout recovery plan (write it down before you need it)

- Physical or console access: a keyboard and monitor, the hypervisor console
  (Proxmox noVNC), or a Pi's SD card readable on another machine.
- For risky remote changes, schedule an automatic rollback before applying
  (see `safe-system-changes`, Linux backups reference): an `at` job that
  restores the backed-up drop-in and reloads sshd in 5 minutes, cancelled
  once the new login works.
- Keep the recovery steps in the stack repository's README so they are
  readable when the server is not.

## Hygiene checks (read-only, safe to run any time)

```bash
sudo sshd -T | grep -Ei 'passwordauth|permitroot|pubkeyauth'
sudo cat /home/*/.ssh/authorized_keys /root/.ssh/authorized_keys 2>/dev/null
journalctl -u ssh --since "24 hours ago" | grep -Ei 'failed|invalid' | tail -n 20
ss -tlnp | grep -E ':22\b'
```

Review `authorized_keys` twice a year: every line should map to a device you
still own. Remove the rest (a journalled change).
