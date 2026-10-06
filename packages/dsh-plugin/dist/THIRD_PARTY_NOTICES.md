# Antigravity OAuth reference

The public installed-application OAuth client configuration and scope list in
`src/driver.mjs` are adapted from LiZhenNet/dsh-antigravity, commit
`94957767c5e247d86cec8833fb1b67f659078af6`:
https://github.com/LiZhenNet/dsh-antigravity/blob/94957767c5e247d86cec8833fb1b67f659078af6/lib/index.js

These constants identify an installed application; they are not user account
credentials. Dockyard retains its own PKCE/state validation, loopback callback,
and DSH credential-store implementation. No third-party plugin is installed.

## MIT License

Copyright (c) 2026 dsh-antigravity contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
