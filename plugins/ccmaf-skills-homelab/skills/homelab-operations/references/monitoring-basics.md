# Monitoring Basics for a Home Server

Home monitoring answers three questions, in this order: **is it up**, **is it
filling up**, **is it dying**. Add a fourth that most setups miss: **did last
night's backup actually run**. Get those four alerting to a phone before
building any dashboard. Metric pipelines, OpenTelemetry and SLO design are
`observability-development`; host log shipping and node exporters at server
scale are `linux-administration`.

## The minimum set

| Question | Check | Alert when |
|---|---|---|
| Is it up? | HTTP/TCP/ping check per service, run from a different machine | Down for 2–3 consecutive checks |
| Is it filling up? | Free space per filesystem and pool | Above 80 % (warn) and 90 % (act); ZFS pools want more headroom, see `nas-and-storage` |
| Is it dying? | smartd self-tests and attribute changes; ZFS/mdadm array state | Any SMART failure or degraded array, immediately |
| Did the backup run? | Dead-man's switch: the backup job pings a URL on success | No ping within the expected window |
| Are containers healthy? | `docker ps --filter health=unhealthy`, restart counts | Unhealthy or restarting for more than a few minutes |
| Will TLS break? | Certificate expiry on anything with a certificate | Less than 14 days left |

Monitoring that runs on the server it monitors cannot report that server
being down. Run the uptime checker on a second device (a Pi, the NAS, or a
free external check service; paid tiers optional).

## Tools that fit home scale

All self-hostable and free; pick one per job rather than all of them.

| Job | Options |
|---|---|
| Uptime checks + status page | Uptime Kuma |
| Dead-man's switch for jobs | Healthchecks (open source, self-hostable; the hosted service has a free tier) |
| Push notifications to a phone | ntfy (self-hostable), Gotify, or the notification channels built into the tools above |
| Live host metrics with little setup | Netdata, Beszel, Glances |
| Full metrics stack (the hobby option) | Prometheus + node_exporter + cAdvisor + Grafana; design depth → `observability-development` |
| Disk health | smartd (smartmontools) with mail or a notify hook; ZFS Event Daemon (ZED); `mdadm --monitor` (`nas-and-storage`) |

Email alerts need a working outbound mail path (an SMTP relay account); test
it, because a silent mail failure looks exactly like "no problems".

## Quick health check (read-only)

Safe to run any time, and a good opening move in "is my server OK?":

```bash
uptime                                         # load and how long since reboot
df -hT -x tmpfs -x devtmpfs                    # space per real filesystem
df -i /                                        # inodes (many small files)
free -h                                        # memory and swap use
systemctl --failed                             # failed units
docker ps --filter health=unhealthy --format '{{.Names}}'
docker ps --filter status=restarting --format '{{.Names}}'
docker system df                               # images/volumes/build cache size
journalctl -p err -b --no-pager | tail -n 30   # errors since boot
zpool status -x 2>/dev/null                    # "all pools are healthy" or the problem
cat /proc/mdstat 2>/dev/null                   # mdadm arrays
sudo smartctl -H /dev/sda                      # per disk; details in nas-and-storage
```

Report findings in plain terms with the next step, and change nothing without
a plan (`safe-system-changes`).

## Finding what filled the disk

```bash
sudo du -xh --max-depth=1 / 2>/dev/null | sort -h | tail -n 15
sudo du -sh /var/lib/docker/containers/*/*-json.log 2>/dev/null | sort -h | tail
journalctl --disk-usage
```

Usual culprits at home: unbounded container logs (fix with log rotation,
`references/compose-stacks.md`), the journal (`SystemMaxUse=` in
`journald.conf`), old images, a download client writing to the system disk,
and backup staging that never gets cleaned. Truncating a container's log
file by hand is a change: journal it, and fix the rotation so it does not
recur.

## Alert hygiene

- Every alert must be something you would act on. An alert that fires daily
  and is ignored trains you to ignore the real one.
- One channel, on the phone, with sensible quiet hours; critical alerts
  (degraded array, failed backup for several days) can override them.
- Write the first response next to each alert in the stack README: "pool
  degraded → run `zpool status`, see nas-and-storage disk replacement".
- Test alerts deliberately after setting them up (smartd's `-M test`,
  `mdadm --monitor --scan --oneshot --test`, stopping a test container).
