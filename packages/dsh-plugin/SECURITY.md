# Security boundary

This package runs inside the DSH host process and can register an LLM adapter,
use DSH Credentials or macOS Keychain, start provider-owned OAuth commands,
and call configured provider endpoints. Plain HTTP provider endpoints are
rejected except for loopback development.

Do not include tokens, OAuth files, Keychain values, or private logs in issue
reports. Report suspected vulnerabilities privately to the repository owner
before public disclosure.
