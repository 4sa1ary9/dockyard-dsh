# @dockyard-dsh/install

One-command installer for Dockyard DSH.

```sh
npx -y @dockyard-dsh/install@latest
```

The installer checks for `dsh` and `pnpm`, installs the currently verified DSH
runtime when `dsh` is missing, and then installs the prebuilt
`@dockyard-dsh/plugin` package into the `web` profile. Restart the running DSH
Web profile after installation so its bundle layer is loaded.

The plugin is macOS-only and requires Node.js 22.19+ or Node.js 24+.
