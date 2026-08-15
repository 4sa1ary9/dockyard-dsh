# Security boundary

Dockyard DSH runs inside the DSH process and therefore has the permissions of
the host process. The plugin can:

- register an LLM adapter and provider-native request transports;
- read and write provider credentials through DSH Credentials or macOS
  Keychain;
- start provider-owned OAuth CLI commands with isolated temporary profiles;
- call the configured provider endpoints over HTTPS.

The optional local page binds to loopback by default. Non-loopback binding
requires both `DOCKYARD_DSH_ALLOW_REMOTE=1` and
`DOCKYARD_DSH_REMOTE_TOKEN`; place any remote access behind HTTPS or a trusted
tunnel. Plain HTTP endpoints are rejected except for loopback development.

Do not include tokens, OAuth files, Keychain values, or private logs in issue
reports. Report suspected vulnerabilities privately to the repository owner
before public disclosure.
