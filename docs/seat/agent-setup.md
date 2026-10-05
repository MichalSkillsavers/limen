# Seat setup for a coding agent

**Paste this whole file into your coding agent.** The agent sets up one Limen seat: a Linux VPS, x86_64 or arm64, that runs jobs while the laptop lid is closed. It works from the laptop over SSH, runs a Check after each step, and stops at each HUMAN step. Background: [remote.md](../remote.md).

## Fill in

```sh
# Ask the human for these values once, at the start.
SEAT_NAME=        # Tailscale machine name, e.g. shop-seat
PUBLIC_IP=        # VPS public IPv4; break-glass SSH only
ADMIN_KEY=        # laptop private key for root over Tailscale (daily admin), e.g. ~/.ssh/shop-seat-admin
BREAK_GLASS_KEY=  # a different laptop private key for root over PUBLIC_IP, e.g. ~/.ssh/shop-seat-glass
WORKER=           # Unix user for the coordinator and all jobs; never sudo
WORKER_KEY=       # a third laptop private key, for WORKER, e.g. ~/.ssh/shop-seat-worker
PROJECT_REPO=     # OWNER/REPO on github.com
PROJECT_BRANCH=   # an existing work branch, not only the default branch
LIMEN_REV=        # 40-hex Limen commit on main that contains this file; the human picks it
MODEL_FLAGS=      # --provider P --model M --thinking T (omp flags; omp has no --engine)
BELL=moshi        # moshi, or ntfy if the phone does not use Moshi
# The agent writes these during the run.
SEAT_HOST=        # phase 2: the full MagicDNS name
APP_ID=           # phase 11: the human gives it; not a secret
# Fixed values. Do not ask for them.
PROJECT_DIR=/home/$WORKER/<REPO part of PROJECT_REPO>
ADMIN_SSH=$SEAT_NAME-root          # laptop alias: root over Tailscale
BREAK_GLASS_SSH=$SEAT_NAME-public  # laptop alias: root over PUBLIC_IP
LIMEN_REPO=https://github.com/overment/limen.git
PEM_SOURCE=/root/limen-app.pem     # root-only file; never in a worker home
```

## Rules for the agent

1. Never ask for, read, print, or store a secret: the App PEM, a Moshi pairing token, a provider login, a `gh` token, an ntfy topic. The HUMAN types them in their own terminal.
2. At a HUMAN step, say what the human must do, with the fill-in values in each command. Then wait until the human says it is done. Then run the Check.
3. Run every Check. A Check states the expected result; some expected results are a non-zero exit. If the result differs, STOP: show the command and its output, and ask the human. Do not invent a repair. `ExperimentalWarning` lines on stderr are not failures.
4. Before you send a command, replace each `$NAME` from the fill-in block with its value. Lower-case variables, such as `$node_arch`, belong to the block; leave them. `root$` runs `ssh $ADMIN_SSH bash -ls <<'EOF'`, then `set -euo pipefail`, the commands, and `EOF`, so a failed line stops the block. `worker$` runs the same through `ssh $SEAT_HOST`. Run each Check in its own call without `set -e`. Each call starts in the home directory. `mac$` is the laptop. `pane$` is the seat coordinator pane in Herdr; the HUMAN types there.
5. Public inbound: port 22 only, for break-glass SSH with `BREAK_GLASS_KEY`. Admin and worker SSH run over the tailnet only. Tailnet inbound: allowed. Never run `tailscale up --ssh` (this guide uses OpenSSH keys on the tailnet), `tailscale funnel`, an unattended reboot, or Docker `-p` without `127.0.0.1:`.
6. Run `limen init` only in `PROJECT_DIR`. Never run it in a tool folder such as `~/.nvm`.
7. Do not push, and do not merge into `main`, in any repository. Only the human does that, after the human says "land".
8. Never run `limen github poll`. Never enable `limen-github.timer` while `limen github doctor` shows a `FIX` other than the timer row.

HUMAN, before phase 1: the laptop has `ssh`, `curl`, Tailscale, Herdr 0.9.3, and Limen ([setup](../setup.md)). Limen runs on the Mac and, from phase 4 on, on the seat too. The laptop has three different key pairs, each a private key file and a matching `.pub` file, at the paths in `ADMIN_KEY`, `BREAK_GLASS_KEY`, and `WORKER_KEY`. To make a missing pair, the HUMAN runs `ssh-keygen -t ed25519 -f <path>`. The phone has Tailscale and Moshi (or the ntfy app). Check: mac$ `herdr --version` prints `herdr 0.9.3`; `command -v limen` prints a path; `ssh-keygen -lf $ADMIN_KEY.pub; ssh-keygen -lf $BREAK_GLASS_KEY.pub; ssh-keygen -lf $WORKER_KEY.pub` prints three different `SHA256:` fingerprints; `test -f $ADMIN_KEY && test -f $BREAK_GLASS_KEY && test -f $WORKER_KEY` exits 0. STOP if not.

## 1 · CPU, box, and break-glass SSH

- HUMAN: create an Ubuntu LTS VPS, x86_64 or arm64, with 8 GB RAM, 150 GB disk or more, 2+ vCPU, and the `BREAK_GLASS_KEY` public key. Add `Host $BREAK_GLASS_SSH` to the laptop `~/.ssh/config`: `HostName $PUBLIC_IP`, `User root`, `IdentityFile $BREAK_GLASS_KEY`, `IdentitiesOnly yes`.
- Check, before any download: mac$ `ssh -o StrictHostKeyChecking=accept-new $BREAK_GLASS_SSH uname -m` prints `x86_64` or `aarch64`. STOP on any other value. Each later download picks its file from this value. Until phase 2 ends, `root$` runs through `$BREAK_GLASS_SSH`.
- root$ `printf 'PasswordAuthentication no\nKbdInteractiveAuthentication no\nPermitRootLogin prohibit-password\n' > /etc/ssh/sshd_config.d/00-limen.conf && sshd -t && systemctl reload ssh && printf 'Unattended-Upgrade::Automatic-Reboot "false";\n' > /etc/apt/apt.conf.d/51-no-auto-reboot`
- root$ `ufw allow OpenSSH && ufw --force enable && apt-get update && apt-get install -y git gh acl mosh python3` (apt checks the signed Ubuntu archive and picks the CPU type).
- Check: root$ `sshd -T | grep -E '^(port|passwordauthentication|kbdinteractiveauthentication|permitrootlogin) '` shows `port 22`, both authentications `no`, and `permitrootlogin without-password`; `ufw status verbose` shows `Status: active`, `Default: deny (incoming)`, and only `22/tcp (OpenSSH)` rules. STOP if not.

## 2 · Tailscale and admin SSH over the tailnet

- root$ `curl -fsSL https://tailscale.com/install.sh | sh` (the script adds the signed Tailscale apt repository; apt picks the CPU type).
- HUMAN, in their own terminal: `ssh -t $BREAK_GLASS_SSH tailscale up --hostname=$SEAT_NAME`. Open the URL that it prints and approve the node. The command returns after the approval.
- root$ `ufw allow in on tailscale0 && tailscale status --json | python3 -c 'import json,sys; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))'`. Write the output into `SEAT_HOST`.
- mac$ `{ printf 'from="100.64.0.0/10,fd7a:115c:a1e0::/48" '; cat $ADMIN_KEY.pub; } | ssh $BREAK_GLASS_SSH 'cat >> /root/.ssh/authorized_keys'`. With the `from=` prefix, sshd accepts `ADMIN_KEY` only from tailnet addresses ([100.x](https://tailscale.com/kb/1015/100.x-addresses), [IPv6](https://tailscale.com/kb/1033/ip-and-dns-addresses)).
- HUMAN: add two hosts to the laptop `~/.ssh/config`. `Host $ADMIN_SSH`: `HostName $SEAT_HOST`, `User root`, `IdentityFile $ADMIN_KEY`, `IdentitiesOnly yes`. `Host $SEAT_HOST`: `User $WORKER`, `IdentityFile $WORKER_KEY`, `IdentitiesOnly yes`.
- Check: mac$ `ssh -o StrictHostKeyChecking=accept-new $ADMIN_SSH 'echo ${SSH_CONNECTION%% *}'` prints an address that starts with `100.` or `fd7a:115c:a1e0:`; `ssh -o HostName=$PUBLIC_IP $ADMIN_SSH true` exits 255 with `Permission denied (publickey)`. root$ `tailscale status` lists the laptop and the phone; `ufw status verbose` shows `Default: deny (incoming)` and only `22/tcp (OpenSSH)`, `Anywhere on tailscale0`, and their `(v6)` rules. STOP if any differs.
- From now on, `root$` runs through `$ADMIN_SSH`. Admin SSH runs over Tailscale only. `$BREAK_GLASS_SSH` is break-glass: use it only when Tailscale is down.

## 3 · Worker without sudo

- root$ `adduser --disabled-password --gecos "" $WORKER && install -d -o $WORKER -g $WORKER -m 700 /home/$WORKER/.ssh && loginctl enable-linger $WORKER`
- mac$ `ssh $ADMIN_SSH "cat > /home/$WORKER/.ssh/authorized_keys && chown $WORKER:$WORKER /home/$WORKER/.ssh/authorized_keys && chmod 600 /home/$WORKER/.ssh/authorized_keys" < $WORKER_KEY.pub`
- root$ `printf 'AllowUsers root %s@100.64.0.0/10 %s@fd7a:115c:a1e0::/48\n' $WORKER $WORKER >> /etc/ssh/sshd_config.d/00-limen.conf && sshd -t && systemctl reload ssh`. The worker logs in over the tailnet only, even with a key that a job adds. Root keeps the public break-glass login.
- Check: root$ `id -nG $WORKER` has no `sudo`, `wheel`, or `admin`; `sudo -l -U $WORKER` says `not allowed`; `grep -rl $WORKER /etc/sudoers /etc/sudoers.d` prints nothing; `loginctl show-user $WORKER -p Linger` is `Linger=yes`. mac$ `ssh -o StrictHostKeyChecking=accept-new $SEAT_HOST true` exits 0; `ssh -o IdentitiesOnly=yes -i $WORKER_KEY $WORKER@$PUBLIC_IP true` exits 255 with `Permission denied (publickey)`. STOP if any differs.

## 4 · Tools

- root$ one root-owned Limen release, for the worker now and the poller later. Never `npm link` a worker clone. `git clone $LIMEN_REPO /opt/limen && git -C /opt/limen checkout --detach $LIMEN_REV && chown -R root:root /opt/limen && chmod -R go-w /opt/limen && ln -sfnT /opt/limen/bin/limen /usr/local/bin/limen`
- root$ stage and install root-owned Node 24.21.0 and Herdr 0.9.3. The `case` picks the file and checksum for this CPU. Each checksum is checked before the file runs. Do not install omp as root.
```sh
case $(uname -m) in
  x86_64)  node_arch=x64 herdr_arch=x86_64
           node_sha=fd8e59d5a511510f6a298afb548f18c7d2b1be404d8b4a27d94fbe49f56cb2d6
           herdr_sha=18a8dc65f1c2fa485884344356dea1cfd911c6f06cf46fa78e193f4087f4dba7 ;;
  aarch64) node_arch=arm64 herdr_arch=aarch64
           node_sha=6ad1325edbdb5649c379b75a237147a666c95d4f9ae8d340fef2d1575d289ad2
           herdr_sha=4de7aa3e25678812e92960de64f7c2aaa1bca1f0f80a3c5e559837e231e1f5c0 ;;
  *) echo "unsupported CPU $(uname -m)" >&2; exit 1 ;;
esac
install -d -o root -g root -m 0700 /root/install
curl -fsSL https://nodejs.org/dist/v24.21.0/node-v24.21.0-linux-$node_arch.tar.xz -o /root/install/node.tar.xz
echo "$node_sha  /root/install/node.tar.xz" | sha256sum -c -
tar -xJf /root/install/node.tar.xz -C /root/install --strip-components=2 node-v24.21.0-linux-$node_arch/bin/node
curl -fsSL https://github.com/herdrdev/herdr/releases/download/v0.9.3/herdr-linux-$herdr_arch -o /root/install/herdr
echo "$herdr_sha  /root/install/herdr" | sha256sum -c -
chown root:root /root/install/node /root/install/herdr
chmod 0755 /root/install/node /root/install/herdr
install -o root -g root -m 0755 /root/install/node /usr/bin/node
install -o root -g root -m 0755 /root/install/node /usr/local/bin/node
install -o root -g root -m 0755 /root/install/herdr /usr/local/bin/herdr
```
- Checksum sources: Node [SHASUMS256.txt](https://nodejs.org/dist/v24.21.0/SHASUMS256.txt); Herdr, the `sha256:` digest of each asset on the [Herdr v0.9.3](https://github.com/herdrdev/herdr/releases/tag/v0.9.3) release page. STOP if a `sha256sum -c` line does not end in `OK`.
- worker$ install worker-owned omp 18.6.1 into `~/.local/bin` (no sudo). Checksum before it runs. Never install a root-owned `/usr/local/bin/omp`.
```sh
case $(uname -m) in
  x86_64)  omp_arch=x64   omp_sha=c92a6846d02984e84f07c6362d18add3783f528f494ffcf1e0f26e594f327463 ;;
  aarch64) omp_arch=arm64 omp_sha=cb7815330bb117877e4e133562ea82e3001ee470e47393552507b5a7f0407f4a ;;
  *) echo "unsupported CPU $(uname -m)" >&2; exit 1 ;;
esac
mkdir -p ~/.local/bin
curl -fsSL https://github.com/can1357/oh-my-pi/releases/download/v18.6.1/omp-linux-$omp_arch -o ~/.local/bin/omp.new
echo "$omp_sha  $HOME/.local/bin/omp.new" | sha256sum -c -
chmod 0755 ~/.local/bin/omp.new && mv ~/.local/bin/omp.new ~/.local/bin/omp
grep -qF '.local/bin' ~/.bashrc 2>/dev/null || printf '\n[ -d "$HOME/.local/bin" ] && PATH="$HOME/.local/bin:$PATH"\n' >> ~/.bashrc
```
- Checksum source: omp [SHA256SUMS.txt](https://github.com/can1357/oh-my-pi/releases/download/v18.6.1/SHA256SUMS.txt) (same digests as the [v18.6.1](https://github.com/can1357/oh-my-pi/releases/tag/v18.6.1) asset list). STOP if a `sha256sum -c` line does not end in `OK`.
- HUMAN: `ssh -t $SEAT_HOST`, then `gh auth login` (GitHub.com, HTTPS), `gh auth setup-git`, and `omp` to log in to the model provider.
- Check: worker$ `node -v` is `v24.21.0`; `command -v limen` is `/usr/local/bin/limen`; `git -C /opt/limen -c safe.directory=/opt/limen rev-parse HEAD` is `LIMEN_REV`; `test -f /opt/limen/docs/seat/agent-setup.md` exits 0; `herdr --version` is `herdr 0.9.3`; `command -v omp` is `$HOME/.local/bin/omp`; `omp --version` is `omp/18.6.1`; `test ! -e /usr/local/bin/omp` exits 0; `gh auth status` exits 0. STOP on any mismatch.

## 5 · Project and `limen init`

`limen init` registers the Git top-level folder of the current directory in `~/.limen/projects` (`src/commands/init.ts:25-26,64`). In a tool folder that is a Git clone, it registers a junk project.

- worker$ `gh repo clone $PROJECT_REPO $PROJECT_DIR -- --branch $PROJECT_BRANCH && cd $PROJECT_DIR && test "$(git rev-parse --show-toplevel)" = $PROJECT_DIR && limen init`
- Check: worker$ `git -C $PROJECT_DIR branch --show-current` is `PROJECT_BRANCH`; `cat ~/.limen/projects` prints `PROJECT_DIR` and no other line (on a seat with older projects: only roots that the HUMAN names); `test -d $PROJECT_DIR/.limen/jobs` exits 0. STOP if not.
- Fix, only with HUMAN approval, for a junk line such as `/home/$WORKER/.nvm`: worker$ `grep -vFx /home/$WORKER/.nvm ~/.limen/projects > ~/.limen/projects.new; cat ~/.limen/projects.new > ~/.limen/projects; rm ~/.limen/projects.new` (`cat >` keeps the file and the poller's read ACL). If the doorbell already runs on this seat, run the first phase 14 Check (`cd $PROJECT_DIR && limen github doctor && limen github status`) again after this. `limen init` in a new project replaces the list file and drops that ACL (`src/project/seat.ts:15-20`); with the doorbell, run the phase 12 block again after it.
- worker$ `cd $PROJECT_DIR && git status --short`. Show it to the HUMAN: `limen init` adds `spec/`, `.agents/limen/`, `.omp/extensions/limen.ts`, `.pi/extensions/limen.ts`, and a `.gitignore` line. The HUMAN decides whether to commit them. Do not push. Jobs branch from the last commit.

Each checkout where `limen init` runs is its own plant, with its own `.limen/` job files. A plant can live on the Mac, on the seat, or on both. Never copy `.limen/` between machines. A job is visible only on the machine that started it. Only a seat plant gets GitHub doorbell wakes.

## 6 · Bell

- Moshi: root$ install `moshi-hook` 0.3.19 for this CPU. Checksum source: [checksums.txt](https://cdn.getmoshi.app/hook/v0.3.19/checksums.txt).
```sh
case $(uname -m) in
  x86_64)  moshi_arch=x86_64 moshi_sha=c94ce3de5b8e7b6d1b9f12d501a95db047f01bf32b6b837e29a4229267ee79d4 ;;
  aarch64) moshi_arch=arm64  moshi_sha=12c06299a4770f0ad8125e95cd49cc6f712d18ae12308af9d2250859b67a7b8e ;;
  *) echo "unsupported CPU $(uname -m)" >&2; exit 1 ;;
esac
curl -fsSL https://cdn.getmoshi.app/hook/v0.3.19/moshi-hook_Linux_$moshi_arch.tar.gz -o /root/install/moshi.tgz
echo "$moshi_sha  /root/install/moshi.tgz" | sha256sum -c -
tar -xzf /root/install/moshi.tgz -C /usr/local/bin moshi-hook
chown root:root /usr/local/bin/moshi-hook && chmod 0755 /usr/local/bin/moshi-hook
```
- worker$ `moshi-hook install --target omp && moshi-hook service install`
- HUMAN, in their own terminal (the token is a secret): `ssh -t $SEAT_HOST moshi-hook pair --store file --name $SEAT_NAME --token <token from the phone: Settings → Integrations>`.
- Check: worker$ `moshi-hook status` says paired and the daemon runs. STOP on `unpaired`. This proves the pairing only.
- ntfy instead: the HUMAN subscribes the phone to a long random topic, then runs mac$ `curl -d test https://ntfy.sh/<topic>`; the phone must buzz. root$ `install -m 0644 /opt/limen/docs/seat/limen-bell.service /opt/limen/docs/seat/limen-bell.timer /etc/systemd/system/ && install -d /etc/systemd/system/limen-bell.service.d && printf '[Service]\nUser=%s\nEnvironment=LIMEN_ROOT=%s\nExecStart=\nExecStart=/opt/limen/docs/seat/bell.sh\n' $WORKER $PROJECT_DIR > /etc/systemd/system/limen-bell.service.d/override.conf`. HUMAN, as root in their own terminal: add `Environment=NTFY_TOPIC=<topic>` to that file. root$ `systemctl daemon-reload && systemctl enable --now limen-bell.timer`. Check: root$ `systemctl is-active limen-bell.timer` is `active`. STOP if not.

## 7 · Herdr session and coordinator

- worker$ `herdr integration install omp`. STOP if it exits non-zero.
- HUMAN: mac$ `herdr --remote $WORKER@$SEAT_HOST`. Open a tab, `cd $PROJECT_DIR`, then pane$ `export LIMEN_COORDINATOR=1 && omp $MODEL_FLAGS`. Ask the coordinator to run `echo $HERDR_ENV $LIMEN_COORDINATOR $HERDR_PANE_ID`.
- Check: the human reports `1 1 <pane id>`. The human detaches and attaches again: the same tab is there. STOP if not.

## 8 · Prune timer

- root$ (`limen prune` drops finished job worktrees; the unit runs it daily as `WORKER`)
```sh
install -m 0644 /opt/limen/docs/seat/limen-prune.service /opt/limen/docs/seat/limen-prune.timer /etc/systemd/system/
install -d /etc/systemd/system/limen-prune.service.d
printf '[Service]\nUser=%s\nWorkingDirectory=%s\nEnvironment=PATH=/usr/local/bin:/usr/bin:/bin\n' $WORKER $PROJECT_DIR > /etc/systemd/system/limen-prune.service.d/override.conf
systemctl daemon-reload && systemctl enable --now limen-prune.timer && systemctl start limen-prune.service
```
- Check: root$ `systemctl show -p Result limen-prune.service` is `Result=success`; `systemctl is-active limen-prune.timer` is `active`. STOP if not.

## 9 · Preview

- worker$ `nohup timeout 600 python3 -m http.server 3000 --bind 127.0.0.1 --directory "$(mktemp -d)" >/dev/null 2>&1 &` (a stand-in app that serves an empty folder and stops after 10 minutes).
- root$ `tailscale serve --bg 3000`. If it prints a link to enable HTTPS, the HUMAN opens it; then run the command again.
- Check: root$ `tailscale serve status` shows one `https://…` URL marked `(tailnet only)` that proxies to `http://127.0.0.1:3000`. mac$ `curl -fsS <that URL>` exits 0; use the URL exactly as printed. mac$ `curl -m 5 http://$PUBLIC_IP:3000/` fails. STOP if the public call answers or the status names Funnel.
- root$ `tailscale serve reset` (a new seat has no other routes to keep).

## 10 · Lid-closed proof

- HUMAN: pane$ ask the coordinator to run `limen spawn --detached --engine omp $MODEL_FLAGS --label seat-smoke "Print seat-smoke and finish. Change no files."`. Then close the laptop lid for five minutes.
- Check: worker$ `cd $PROJECT_DIR && limen jobs seat-smoke` starts with `DONE` (`produced nothing` is fine here). mac$ `herdr --remote $WORKER@$SEAT_HOST` shows the same coordinator tab. STOP if not.
- Prove later, not a gate: the Moshi phone ring. Ask the human if the phone rang, and write the answer in your report. A silent phone does not stop setup. Jobs start with `--no-extensions` (`src/runtime/engine.ts:136`), so only the coordinator's turn after the completion wake can ring Moshi.
- Check (lock-down end state): mac$ `ssh $ADMIN_SSH 'echo ${SSH_CONNECTION%% *}'` prints a `100.` or `fd7a:115c:a1e0:` address; `ssh -o HostName=$PUBLIC_IP $ADMIN_SSH true` and `ssh -o IdentitiesOnly=yes -i $WORKER_KEY $WORKER@$PUBLIC_IP true` both exit 255 with `Permission denied (publickey)`; `ssh $BREAK_GLASS_SSH true` exits 0, so break-glass still works. STOP if any differs.

The seat is ready after this phase. HUMAN: decide whether this project uses the opt-in GitHub doorbell (phases 11–14): a PR or issue comment with `@limen` or `/limen` from a writer wakes the coordinator. If not, setup ends here.

## 11 · GitHub App (HUMAN)

- HUMAN: under the account that owns `PROJECT_REPO`: Settings → Developer settings → GitHub Apps → New GitHub App. Name: any unique name. Homepage URL: `https://github.com/$PROJECT_REPO`. Webhook: clear **Active**. Repository permissions: Metadata **Read-only**, Issues **Read & write**, Pull requests **Read-only**; all others **No access**. Where can this GitHub App be installed: **Only on this account**.
- HUMAN: give the agent the App ID for `APP_ID`. Generate a private key. Install the App with **Only select repositories** → `PROJECT_REPO`. One App and one key per seat.
- HUMAN: mac$ `ssh $ADMIN_SSH "umask 077; cat > $PEM_SOURCE" < <downloaded .pem>`
- Check: root$ `stat -c '%U %a' $PEM_SOURCE` is `root 600`. Never read the file. STOP if not. Then the HUMAN deletes the laptop copy. Keep `PEM_SOURCE`: every setup run reads it.

## 12 · Doorbell install and connect

- root$ (a root-owned installer checkout at the same revision, then the installer)
```sh
test -d /root/limen-deploy/.git || git clone $LIMEN_REPO /root/limen-deploy
git -C /root/limen-deploy fetch origin $LIMEN_REV && git -C /root/limen-deploy checkout --detach $LIMEN_REV
WORKER=$WORKER APP_ID=$APP_ID PEM_SOURCE=$PEM_SOURCE LIMEN_REPO=$LIMEN_REPO LIMEN_REV=$LIMEN_REV \
  NODE_SOURCE=/root/install/node HERDR_SOURCE=/root/install/herdr /root/limen-deploy/docs/seat/github-setup.sh
```
- Check: it exits 0 and prints a line that starts `Setup installed`; root$ `systemctl is-enabled limen-github.timer` prints `disabled` (setup runs `systemctl disable --now limen-github.timer`, so a reboot cannot start polling before phase 13 enables it); worker$ `test ! -r /etc/limen-github/app.pem` exits 0. STOP if not, and show the script's message.
- Check: worker$ `cd $PROJECT_DIR && limen jobs --running` prints `no running jobs` or `no jobs`. STOP if it lists a job: wait until the jobs finish.
- worker$ `herdr server stop`. This closes every pane. The server must restart to get the new `limen-github` group.
- HUMAN: mac$ `herdr --remote $WORKER@$SEAT_HOST`, open a tab, `cd $PROJECT_DIR`, pane$ `export LIMEN_COORDINATOR=1 && omp $MODEL_FLAGS`. Ask the coordinator to run `id -nG`, then `limen github connect`.
- Check: `id -nG` lists `limen-github`; connect prints a line that starts `connected $PROJECT_REPO → Herdr`. STOP if not.

## 13 · Doctor, then the timer

- Check: worker$ `cd $PROJECT_DIR && limen github doctor` exits 1; this is expected here. The only `FIX` line starts `FIX enabled active GitHub timer`; stderr ends with `github doctor: 1 prerequisite need repair`; `SKIP` lines are fine. STOP on any other `FIX`. Doctor also checks every other project bound on this seat; a closed coordinator there is a `FIX` too.
- root$ `systemctl enable --now limen-github.timer`
- Check: root$ `systemctl is-enabled limen-github.timer` is `enabled`; `systemctl is-active limen-github.timer` is `active`. STOP if not.

## 14 · Doctor again and live trial

- Check: worker$ `cd $PROJECT_DIR && limen github doctor && limen github status` exits 0, doctor prints no `FIX`, and status prints `$PROJECT_REPO → Herdr <pane id>`. If not: root$ `systemctl disable --now limen-github.timer`, then STOP.
- HUMAN: on an open PR in `PROJECT_REPO`, in the **Conversation** tab (not a review or a line comment), comment `@limen please review this PR`. If no PR is open, the HUMAN opens one first.
- Check: in about two minutes the coordinator pane gets the request; worker$ `cd $PROJECT_DIR && limen github status` names that PR; root$ `journalctl -u limen-github.service -n 50 --no-pager` shows no error. If not: root$ `systemctl disable --now limen-github.timer`, then STOP.

## Upgrade

1. With the doorbell: root$ the phase 12 block with the new `LIMEN_REV`. It disables and stops the timer, moves `/opt/limen`, and keeps the CLI and the poller on one release. Without the doorbell: root$ `git -C /opt/limen fetch origin $LIMEN_REV && git -C /opt/limen checkout --detach $LIMEN_REV && chmod -R go-w /opt/limen`.
2. HUMAN: restart the coordinator in its pane, so that it loads the new release. Then run the phase 4 Check; STOP on any mismatch. With the doorbell, then run phases 13 and 14.
3. New pinned versions: take the hash for both CPU types from the vendor source that phase 4 or phase 6 names. Never compute a hash yourself.
