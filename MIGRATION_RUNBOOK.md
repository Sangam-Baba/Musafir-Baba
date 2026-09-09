# 🖥️ Server Migration Runbook

## Ground rule — read this before anything else

The old laptop (`3mongoose`) is a **live, multi-user server**, not a personal
dev box. Zero tolerance for surprising it. So every command below is tagged:

- 🟢 **SAFE** — read-only, or acts only on the new machine. Can be run
  anytime, in any order, with no discussion.
- 🔴 **STATE-CHANGING** — touches the old machine's running state in some way
  (stopping/starting/restarting a container or service, installing a systemd
  unit, changing DNS/tunnel routing). **These are never run without asking
  you first, individually, right before running it — not approved in bulk up
  front, and not assumed from an earlier "yes."**

The only 🔴 action taken so far, for the record: `3mongoose-postgres` and
`algebrians-db` were briefly stopped and restarted (~3 seconds each) to take
a volume snapshot — before you clarified those weren't needed. Both came back
healthy and confirmed running normally; that snapshot has since been deleted.
Nothing else on the old machine has been touched.

Two playbooks follow:
- **Part A** — you have the old laptop. The realistic, actually-needed path.
- **Part B** — you don't (wiped/returned). Rebuild from GitHub + Cloudflare +
  provider dashboards.

---

## What's actually in scope

Confirmed today, which simplifies this a lot from earlier drafts:

| Service | Type | Data lives... | In scope? |
|---|---|---|---|
| `musafirbaba-backend` | Docker, git-cloned from this repo | MongoDB **Atlas** (cloud) | ✅ code + config only, no DB migration |
| `3mongoose-api` (NestJS/Prisma) | PM2 | Postgres on **Neon** (cloud) — confirmed via `DATABASE_URL` in `apps/api/.env`, `ep-hidden-recipe-....neon.tech` | ✅ code + config only, no DB migration |
| `3mongoose-cms` | PM2 (`serve`) | static build output | ✅ code only |
| `3mgs-frontend` | Docker | — | ✅ |
| `uptime-kuma` | Docker | its own local volume (monitor definitions) | ✅, but starts empty on the new machine — re-add monitors by hand, low effort |
| `3mongoose-postgres` (local container) | Docker | **unused** — nothing in the app connects to it (only `.env.example`/docs reference it) | ❌ **out of scope, don't even bring it up on the new machine** |
| `algebrians-php` + `algebrians-db` | Docker | local MySQL, ~3GB | ❌ **out of scope — you're rebuilding this one from scratch separately** |
| GitHub Actions runners (cms, UI) | systemd | — | ✅ must be freshly re-registered, cannot be copied |
| `cloudflared` (tunnel `1260ba8d-...`) | systemd | — | ✅ |

**Still unresolved, check yourself before Part A9 / Part B5:** `musafirbaba.com`
and `3mongoose.online` both resolve through Cloudflare's proxy, but the local
`~/.cloudflared/config.yml` only routes SSH and 404s everything else. What
actually serves those two domains publicly isn't visible from SSH access
alone — confirm it in the Cloudflare Zero Trust dashboard (Networks →
Tunnels → every tunnel on the account → every Public Hostname route) before
touching the tunnel at cutover time.

Also still true: `backend/.env`'s `BACKEND_URL` points at
`musafir-baba-backend.onrender.com` — production Musafir Baba traffic is very
likely already served by Render, not this laptop, and the local
`musafirbaba-backend` container is bound to `127.0.0.1` only (not
internet-reachable) — consistent with it being an internal/staging copy.
**Nothing in this document touches Render or Vercel.**

---

# Part A — Migration with the old laptop available

Old machine stays fully running and untouched (beyond 🟢 reads) until A9.
Nothing is stopped, disabled, or reconfigured on it until its replacement has
been independently verified end to end on the new machine first.

## A0 — Preconditions 🟢

- [ ] Cloudflare dashboard checked: full list of tunnels + Public Hostname
      routes, written down.
- [ ] GitHub admin access to both repos confirmed.
- [ ] New laptop: Ubuntu installed, reachable over SSH with your key.
- [ ] Re-confirm old-box versions (things may drift):
  ```bash
  ssh 3mongoose "lsb_release -a; node -v; npm -v; pm2 -v; docker -v; docker compose version; cloudflared -v"
  ```
  Last recorded: Ubuntu 24.04.4 LTS, Node v22.22.3, npm 10.9.8, PM2 7.0.3,
  Docker 29.5.3 + Compose v5.1.4, cloudflared 2026.6.0.

## A1 — Base OS + tooling on the new laptop 🟢 (nothing here touches the old machine)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git build-essential rsync ufw openssh-server
sudo systemctl enable --now ssh

curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2@7.0.3 serve
sudo corepack enable && corepack prepare pnpm@latest --activate

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloudflare-main.gpg
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
```
Use username `shershah` when creating the account — matches the old box,
avoids rewriting hardcoded `/home/shershah/...` paths later in PM2 configs
and the deploy script.

**Verify 🟢:** `node -v`, `docker -v`, `cloudflared -v` roughly match A0.

## A2 — Copy code + config off the old machine 🟢 (read-only on the old side)

Verified breakdown of `~/server` (7.4GB with build artifacts already
stripped): **2.7GB** is `apps/php-website/algebrians` (out of scope — you're
rebuilding it separately), **2.5GB** is a stray `algebrians.com.backup.zip`
sitting next to it (a stale backup-of-a-backup, not worth carrying forward
at all), and **2.3GB** is `server/runners/github-runner` — the GitHub Actions
runner's own downloaded binaries, fully reproducible by re-registering in A7,
not unique data. Excluding all three plus `node_modules`/`dist` (rebuilt
fresh in A5 via `pnpm install`), the actual backup is **~130MB**.

```bash
rsync -avz --progress \
  --exclude 'node_modules' --exclude 'dist' --exclude '.next' --exclude 'build' \
  --exclude 'apps/php-website/algebrians/' \
  --exclude 'apps/php-website/algebrians.com.backup.zip' \
  --exclude 'runners/github-runner/' \
  3mongoose:~/server/ ~/server/

# recreate empty placeholders so the directory tree still matches the old
# machine's, even though the contents were deliberately skipped
mkdir -p ~/server/apps/php-website/algebrians ~/server/runners/github-runner
```

At ~130MB there's no need for anything beyond this single command — no
external drive, no compression tuning, no chunking. It'll transfer in
seconds. Still worth landing it somewhere encrypted before the new laptop
even exists (a password manager attachment, an encrypted folder) since it
carries live `.env` secrets and the tunnel credential file — see A3.

`.env` files aren't all under `~/server` and some are deliberately excluded
from the deploy script's own rsync — pull them explicitly:
```bash
rsync -avz 3mongoose:~/server/apps/3mongoose-website-cms/apps/api/.env ~/server/apps/3mongoose-website-cms/apps/api/.env
rsync -avz 3mongoose:~/server/apps/3mongoose-website-cms/apps/cms-admin/.env ~/server/apps/3mongoose-website-cms/apps/cms-admin/.env
rsync -avz 3mongoose:~/server/docker/musafirbaba-backend/.env ~/server/docker/musafirbaba-backend/.env
```
(confirm the actual `.env` path for `musafirbaba-backend` first —
`docker inspect musafirbaba-backend` will show if it's bind-mounted from
somewhere else.)

**Verify 🟢:** `find ~/server -iname ".env*"` on the new machine lists the
same files as `ssh 3mongoose "find ~/server -iname '.env*'"` does on the old
one.

## A3 — Cloudflare tunnel identity 🟢 (copy only, service stays off)

```bash
scp 3mongoose:~/.cloudflared/1260ba8d-8928-4c0d-8b14-7927ac370913.json ~/.cloudflared/
scp 3mongoose:~/.cloudflared/cert.pem ~/.cloudflared/
scp 3mongoose:~/.cloudflared/config.yml ~/.cloudflared/
chmod 600 ~/.cloudflared/*.json ~/.cloudflared/cert.pem
chmod 644 ~/.cloudflared/config.yml
```
This is inert until the service is started in A9 — safe to do anytime.

## A4 — Bring up Docker services (new machine only, not public yet) 🟢

Only the three actually-in-scope containers — no local Postgres, no
algebrians:
```bash
cd ~/server/docker/musafirbaba-backend && docker compose build && docker compose up -d
cd ~/server/apps/3mgs-frontend && docker compose up -d
cd ~/server/apps/uptime-kuma && docker compose up -d
```

**Verify 🟢, locally on the new box only:**
```bash
docker ps
curl -sf http://127.0.0.1:8000/ && echo "backend OK"
curl -sf http://127.0.0.1:3001/ && echo "3mgs-frontend OK"
curl -sf http://127.0.0.1:3005/ && echo "uptime-kuma OK"
```
Don't move on past a failing check — the old box is still serving everything
while you fix it, which is the entire point of this order.

## A5 — PM2 apps 🟢

```bash
cd ~/server/apps/3mongoose-website-cms
pnpm install --frozen-lockfile
pnpm --filter @apps/api prisma generate
pnpm --filter @packages/shared build
pnpm --filter @apps/api build
pnpm --filter @apps/cms-admin build

cd apps/api && pm2 start dist/main.js --name 3mongoose-api
cd ../cms-admin && pm2 start serve --name 3mongoose-cms -- -s dist -l 3000

pm2 save
pm2 startup     # run the exact command it prints, as root
```
**Verify 🟢:**
```bash
curl -sf http://127.0.0.1:3000/ && echo "cms OK"
pm2 status
```
`prisma generate` will reach out to Neon over the network — confirm that
succeeds (proves the new machine can actually reach the real database before
you rely on it).

## A6 — Git access for the auto-deploy pipeline 🟢

`~/server/docker/musafirbaba-backend` is a real git clone the deploy
workflow runs `git fetch`/`git reset --hard` against, over SSH. Keys aren't
meant to be copied between machines — generate a fresh one:
```bash
ssh-keygen -t ed25519 -C "musafirbaba-deploy-new-laptop" -f ~/.ssh/musafirbaba_deploy -N ""
cat ~/.ssh/musafirbaba_deploy.pub
# -> GitHub repo Settings → Deploy keys → add, read-only is enough
```
```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com-musafirbaba-deploy
    HostName github.com
    User git
    IdentityFile ~/.ssh/musafirbaba_deploy
    IdentitiesOnly yes
EOF
cd ~/server/docker/musafirbaba-backend
git remote set-url origin git@github.com-musafirbaba-deploy:Sangam-Baba/Musafir-Baba.git
```
**Verify 🟢:** `git fetch origin main` succeeds, no prompt, no error.

## A7 — Re-register the GitHub Actions runners

Runner identity is per-machine — can't be copied. This step is mostly 🟢
(new machine + your own GitHub settings), except the final sub-step, which
is 🔴 because it removes something from the old machine's registration.

0. 🟢 In GitHub → repo → Settings → Actions → Runners, click the existing
   runner, note its **exact label(s)**. Confirmed: this repo's workflow needs
   `runs-on: musafirbabaserver` — a custom label, not `self-hosted`. Check
   the cms repo's workflow the same way.
1. 🟢 Same page → New self-hosted runner → copy the token (expires ~1 hour —
   generate right before step 2).
2. 🟢 On the new machine:
   ```bash
   mkdir ~/actions-runner-musafirbaba && cd ~/actions-runner-musafirbaba
   curl -o actions-runner.tar.gz -L <URL from GitHub's instructions>
   tar xzf actions-runner.tar.gz
   ./config.sh --url https://github.com/Sangam-Baba/Musafir-Baba \
       --token <TOKEN> --labels musafirbabaserver
   sudo ./svc.sh install
   sudo ./svc.sh start
   ```
   Repeat into `~/actions-runner-cms` for
   `https://github.com/MusafirBaba/3mongoose-website-cms` with whatever
   label(s) step 0 found.
3. 🟢 **Verify:** both new runners show **Idle** in GitHub.
4. 🟢 **Verify end-to-end:** push a no-op commit touching `backend/**`,
   confirm the workflow runs on the new runner and reports the container
   healthy — while the old box is still the one serving real traffic, so a
   pipeline bug can't coincide with a live cutover.
5. 🔴 **Only after 3 and 4 both pass**, and only with your go-ahead at that
   moment: remove the *old* machine's runner registrations from GitHub
   Settings → Runners, so a mid-transition push can't land on a runner that's
   about to be decommissioned. This doesn't touch the old box directly (it's
   a GitHub-side deregistration), but flagging it 🔴 anyway since it changes
   what the old machine can still do.

## A8 — Cut the tunnel over 🔴 (the one step that moves public traffic)

Do not start here. Confirm A4–A7 are fully verified first. Then, and only
with your explicit go-ahead in the moment:

```bash
# on the NEW machine
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl status cloudflared    # look for "Registered tunnel connection"
```
**Verify 🟢 before touching the old machine at all:**
```bash
curl -I https://musafirbaba.com
curl -I https://3mongoose.online
```
Only once the new machine is confirmed answering correctly:
```bash
# on the OLD machine — 🔴, ask first
sudo systemctl stop cloudflared
sudo systemctl disable cloudflared
```
**Verify 🟢:** `ssh 3mongoose "hostname"` now returns the new machine's name.

If anything looks wrong at any point in this step: reverse it —
`sudo systemctl stop cloudflared` on the new machine,
`sudo systemctl start cloudflared` on the old one. The old machine's actual
services (Docker containers, PM2 apps) are never touched by this step, so
reversing the tunnel alone fully reverts traffic.

## A9 — Soak, then decommission 🔴 (final step, days later, explicit go-ahead)

- Watch `docker logs -f <container>` / `pm2 logs` on the new machine for
  30–60 minutes after A8.
- Confirm uptime-kuma shows everything green (re-add its monitors first,
  since it started with an empty volume).
- Leave the old machine's Docker/PM2/GitHub-runner services **installed and
  simply not receiving traffic** for several days. Nothing forces you to
  touch them at all until you're confident.
- Only when you explicitly decide to, on the OLD machine:
  ```bash
  pm2 kill
  cd ~/server/docker/musafirbaba-backend && docker compose down
  cd ~/server/apps/3mgs-frontend && docker compose down
  cd ~/server/apps/uptime-kuma && docker compose down
  sudo systemctl disable --now docker
  ```
  Then repurpose or wipe it.

---

# Part B — Rebuilding with zero access to the old laptop

Since both databases are cloud-hosted (Atlas, Neon), this is far less risky
than it sounds — no data is lost by losing the laptop. What you actually lose
without the laptop:

- **Gone:** the exact previous JWT/session secret values (not a real
  problem — generate new ones with `openssl rand -hex 32`; this just logs
  everyone out once, nothing worse), and uptime-kuma's monitor definitions
  (a few minutes of re-adding them by hand).
- **Fine regardless:** all source code (GitHub), both databases (Atlas /
  Neon), every provider API key (Cloudinary/Razorpay/PayU/LocationIQ/Ably/
  Resend — all viewable/rotatable from their own dashboards), Render/Vercel.

## B1 — OS + tooling 🟢

Identical to Part A, Step A1 — copy it verbatim.

## B2 — Code, fresh from GitHub 🟢

```bash
mkdir -p ~/server/docker ~/server/apps

ssh-keygen -t ed25519 -C "musafirbaba-deploy" -f ~/.ssh/musafirbaba_deploy -N ""
cat ~/.ssh/musafirbaba_deploy.pub
# -> add as a Deploy Key (read-only) on Sangam-Baba/Musafir-Baba

cat >> ~/.ssh/config <<'EOF'
Host github.com-musafirbaba-deploy
    HostName github.com
    User git
    IdentityFile ~/.ssh/musafirbaba_deploy
    IdentitiesOnly yes
EOF
git clone github.com-musafirbaba-deploy:Sangam-Baba/Musafir-Baba.git ~/server/docker/musafirbaba-backend

ssh-keygen -t ed25519 -C "3mongoose-deploy" -f ~/.ssh/3mongoose_deploy -N ""
cat ~/.ssh/3mongoose_deploy.pub
# -> add as a Deploy Key on MusafirBaba/3mongoose-website-cms

cat >> ~/.ssh/config <<'EOF'
Host github.com-3mongoose-deploy
    HostName github.com
    User git
    IdentityFile ~/.ssh/3mongoose_deploy
    IdentitiesOnly yes
EOF
git clone github.com-3mongoose-deploy:MusafirBaba/3mongoose-website-cms.git ~/server/apps/3mongoose-website-cms
```

Recreate `uptime-kuma`'s compose file (it isn't app code you own in a repo):
```yaml
# ~/server/apps/uptime-kuma/docker-compose.yml
services:
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    ports:
      - "3005:3001"
    volumes:
      - uptime-kuma-data:/app/data
volumes:
  uptime-kuma-data:
```

## B3 — Secrets 🟢

For each `.env` (`backend/.env`,
`3mongoose-website-cms/apps/api/.env`, `.../apps/cms-admin/.env`): pull
Cloudinary/Razorpay/PayU/LocationIQ/Ably/Resend/Neon/Atlas values from their
respective dashboards, generate fresh values for anything laptop-only
(`openssl rand -hex 32` for JWT/session secrets).

## B4 — Everything else 🟢

From here, run Part A's **A4 (docker), A5 (PM2), A6 (git access), A7 (GitHub
runners)** verbatim — none of them reference the old machine.

## B5 — Cloudflare tunnel 🔴

No old `~/.cloudflared` to copy from. Instead, use the dashboard:
```
Zero Trust dashboard → Networks → Tunnels → (the existing tunnel, if still
listed) → Install and run a connector
```
This gives a one-line install with an embedded token —
`cloudflared service install <TOKEN>` — authenticating the new machine as a
connector for the same tunnel without needing the old `cert.pem`/credentials
file at all. If the tunnel isn't listed (fully gone), create a new one from
the same screen and re-point each domain's DNS to it — the only case where a
DNS change is unavoidable, since the tunnel identity itself is what's
missing.

**Verify 🟢:** `curl -I` each domain from a third machine;
`ssh 3mongoose "hostname"` returns the new machine's name.
