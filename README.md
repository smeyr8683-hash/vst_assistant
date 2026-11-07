# VST Assistant Team 0.2.0

Local Facebook Page publishing test package, based on the supplied VST Assistant source with HTTPS, local encrypted SQLite storage, OAuth state checking and Bot-off backend gates.

Start with [START_HERE.md](START_HERE.md) for Khmer setup instructions, [FACEBOOK_SETUP_KM.md](FACEBOOK_SETUP_KM.md) for Meta configuration, and [ANTIGRAVITY_INSTRUCTIONS.md](ANTIGRAVITY_INSTRUCTIONS.md) for AI-assisted installation.

```sh
npm run setup:local
# Fill your own Meta App and Configuration IDs in .env.local.
npm run check:local
npm run start:local
```

Node.js 22.14+ with node:sqlite is required. URL: https://localhost:3443. The server binds to 127.0.0.1. This is a development/local test edition, not a public multi-user deployment.

The release intentionally excludes personal environment files, databases, access tokens, TLS private keys, certificate authorities, node_modules and build output. Never redistribute an installation after connecting your accounts; redistribute only the clean release ZIP.

Manual local photo Feed publishing is the first test path. Facebook authorization, account eligibility and Page access must be configured separately. No real post is pre-authorized by installing the package. Cloud media hosting, AI captions and bot automation require separate setup and validation.

See RELEASE_NOTES.md for validation scope and limitations.
