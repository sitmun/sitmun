# Deployment

Deploy [sitmun/sitmun](https://github.com/sitmun/sitmun). Components are directories in that repository. The Compose file is `compose.yaml`. Historical release tags are `legacy/<repository>/<tag>`.

1.3.0 runs from `ghcr.io/sitmun/front`, `backend`, `proxy`, and `mbtiles` at tag `1.3.0`. Clone the `v1.3.0` tag, because `front` mounts `docker/front/config` and `backend` mounts `profiles/` from that checkout. Copy `profiles/postgres.env` or `profiles/oracle.env` to `.env`. `setup.ps1` or `setup.sh` appends `SITMUN_USER_SECRET`, `MIDDLEWARE_SECRET`, and `SITMUN_MBTILES_JOB_HANDLE_SECRET`.

Windows:

```powershell
git clone --branch v1.3.0 https://github.com/sitmun/sitmun.git
cd sitmun
Copy-Item profiles\postgres.env .env
.\setup.ps1
docker compose up -d --pull always --no-build
```

Linux:

```bash
git clone --branch v1.3.0 https://github.com/sitmun/sitmun.git
cd sitmun
cp profiles/postgres.env .env
./setup.sh
docker compose up -d --pull always --no-build
```

`docker compose up -d` without `--no-build` builds this checkout. An upgrade from 1.2.8 or 1.2.9 sets `SITMUN_UPGRADE_DEFAULT_LANGUAGE` in `.env` before that start. See [Upgrade 1.2.9 to 1.3.0](docs/upgrade/1.2.9-to-1.3.0.md) and [Upgrade 1.2.8 to 1.3.0](docs/upgrade/1.2.8-to-1.3.0.md). URLs and variables are in [README.md](README.md).

## IIS as a reverse proxy

IIS (Internet Information Services) reverse-proxies to SITMUN with Application Request Routing (ARR) and URL Rewrite. SITMUN listens on port 9000 unless `LOCAL_PORT` says otherwise.

### Prerequisites

- [Application Request Routing (ARR)](https://learn.microsoft.com/en-us/iis/extensions/planning-for-arr/application-request-routing-version-2-overview) is installed.
- [URL Rewrite](https://learn.microsoft.com/en-us/iis/extensions/url-rewrite-module/using-the-url-rewrite-module) is installed.
- SITMUN is running.

### Own hostname

SITMUN answers at the root of a hostname, for example `https://sitmun3.example.com/`. The published images work unchanged. Set in `.env`:

```properties
PUBLIC_URL_SCHEME=https
PUBLIC_HOSTNAME=sitmun3.example.com
PUBLIC_PORT=
PUBLIC_BASE_PATH=/
```

### Path prefix

SITMUN answers under a path on another host, for example `https://example.com/sitmun3/`. The published front image has `/admin/`, `/viewer/`, and `/backend` built in ([docker/front/Dockerfile](docker/front/Dockerfile)), so build `front` from the checkout with the prefix. The IIS rule below forwards `/sitmun3/...` unchanged, so nginx also needs `LOCAL_BASE_PATH` ([default.conf.template](docker/front/config/default.conf.template)). Set in `.env`:

```properties
PUBLIC_URL_SCHEME=https
PUBLIC_HOSTNAME=example.com
PUBLIC_PORT=
PUBLIC_BASE_PATH=/sitmun3/
LOCAL_BASE_PATH=/sitmun3/
```

Then build `front`, pull the published `backend` and `proxy`, and start without pulling `front` again:

```text
docker compose build front
docker compose pull --policy always backend proxy
docker compose up -d --no-build
```

`--pull always` would replace the local `front` with the published one. `pull_policy: build` in `compose.yaml` makes a plain `docker compose pull` skip `backend` and `proxy`, so the pull needs `--policy always`. Add `mbtiles` to the pull when `COMPOSE_PROFILES` includes it.

### Enable Application Request Routing

1. Open IIS Manager.
2. In **Connections**, select the server node.
3. Double-click **Application Request Routing Cache**.
4. In **Actions**, select **Server Proxy Settings**.
5. Check **Enable Proxy**.
6. To pass the client address in `X-Forwarded-For`, enable **Preserve client IP**.
7. Click **Apply**.

Microsoft reference: [Creating a Forward Proxy Using Application Request Routing](https://learn.microsoft.com/en-us/iis/extensions/configuring-application-request-routing-arr/creating-a-forward-proxy-using-application-request-routing).

### Create the reverse proxy rule

1. In IIS Manager, at the server or the site, double-click **URL Rewrite**.
2. In **Actions**, click **Add Rule(s)**.
3. Choose **Blank Rule** under **Inbound rules** and click **OK**.
4. Name the rule **Reverse Proxy to SITMUN**.

In **Match URL**, set:

- Requested URL: **Matches the Pattern**
- Using: **Regular Expressions**
- Pattern: `.*` for an own hostname, or `^sitmun3(/.*)?$` for the `/sitmun3/` prefix. The prefix pattern matches `sitmun3` and `sitmun3/...`.
- Ignore case: checked

In **Action**, set:

- Action type: **Rewrite**
- Rewrite URL: `http://localhost:9000/{R:0}`
- Append query string: checked

Replace `localhost:9000` with the host and port SITMUN listens on.

Open the public URL in a browser. If it fails, check that port, the firewall, and the rewrite pattern.
