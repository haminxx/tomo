<picture>
  <source srcset="./docs/brand/logo-dark.svg" media="(prefers-color-scheme: dark)"/>
  <img src="./docs/brand/logo-light.svg" width="48" alt="tomo"/>
</picture>

### tomo

a collaborative workspace for humans and agents.
<br/>
[tomo.computer](https://tomo.computer)

<br/>

<a href="https://tomo.computer"><img src="./docs/readme/site.gif" width="100%" alt="the tomo.computer homepage demo: a shared desktop where people and Codex open a terminal, a live preview and an editor together, above tabs for one shared desktop, agents, live previews and co-editing"/></a>

<br/>
<br/>

<img src="./docs/readme/idea.svg" width="100%" alt="today everyone works on their own machine; with tomo the team and its agents share one computer"/>

<br/>

work is multiplayer. computers are single-player. tomo gives every team one persistent cloud computer in the browser, where people and agents work side by side and nothing needs to be sent anywhere.

- **shared desktop.** windows, a dock and several desktops, the same for everyone
- **live terminal.** a real shell that every member types into together
- **co-editing.** files and notes edited at the same time, synced with Yjs
- **agents in the room.** Codex runs on the same machine and touches the same files you do
- **persistent.** close the tab and the computer is still there tomorrow

<br/>

### how it works

<img src="./docs/readme/stack.svg" width="100%" alt="browser to caddy to the node api, which uses sqlite and runs one docker container per workspace"/>

each workspace is its own Docker container with Python, Node, and git. the API streams terminals to everyone connected and syncs desktop state over WebSockets. all of it runs on one Oracle Cloud Always Free Ampere VM. there's a [more detailed diagram](./docs/architecture/architecture.png) too.

| | |
| --- | --- |
| `packages/web` | React Router, Vite, Tailwind |
| `packages/api` | Node, Hono, Drizzle + SQLite, dockerode, Yjs |
| `packages/api/src/sandbox` | the workspace image |
| `infra` | OpenTofu, cloud-init, Caddy |

<br/>

### run it

```sh
cp .env.example .env
pnpm install
pnpm sandbox:build
pnpm dev
```

needs Node 22, pnpm and a running Docker daemon. fill in `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). `DOMAIN` is the public hostname Caddy and the API use; it defaults to `tomo.computer` when unset. `OPENAI_API_KEY` is optional. Google OAuth is not used. boot seeds one guest on one workspace, and `/` opens that shared desktop.

deploy with OpenTofu on Oracle Cloud. copy `infra/terraform.tfvars.example` to `infra/terraform.tfvars` and fill in your tenancy. the example is an Always Free Ampere VM: `VM.Standard.A1.Flex`, 2 OCPUs, 12 GB RAM, Ubuntu 24.04 aarch64, and one 50–100 GB boot volume. `pnpm infra:plan` previews it. do not apply until the account is yours. set `VM_HOST` to the instance public IPv4 before `pnpm ship`.

<br/>
<br/>

<div align="right">
<i>made by two friends, manu &amp; chris</i> &nbsp;&bull;&nbsp; <a href="./LICENSE">MIT</a>
</div>
