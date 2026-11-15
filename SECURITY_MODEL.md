# Security model: jonahthecodah/juice-shop

Threat model used to prioritize security scan findings for this fork. Facts marked **(user)** come from the repository owner (Jonah); everything else is inferred from the code and upstream docs and does not by itself change a finding's priority.

## System overview
OWASP Juice Shop is an *intentionally vulnerable* web shop used for security training and CTFs. It ships ~118 deliberate hacking challenges (`data/static/challenges.yml`) plus coding challenges (`vuln-code-snippet` markers in `routes/`, `lib/`, `server.ts`, `models/`, `frontend/src`; fixes in `data/static/codefixes/`). A Node/Express server (`server.ts`, `app.ts`) serves an Angular SPA (`frontend/`) and REST/API routes (`routes/`), backed by SQLite via Sequelize (`models/`) and MarsDB (reviews, orders), and the local file system (`ftp/`, `uploads/`, `logs/`).

Existing security docs in the repo (upstream's, not Jonah's):
- `SECURITY.md`: only vulnerabilities **not** part of a hacking challenge are real security issues.
- `threat-model.json` (OWASP Threat Dragon): actors B2C customer, B2B customer, Admin, Accounting (browsers); Google OAuth2 out of scope; stores SQLite, MarsDB, local file system.
- `AGENTS.md` / `infrastructure/README.md`: everything in `infrastructure/` and `infrastructure/terraform/` (and the root `terraform/`, used by the "Vulnerable Infrastructure" challenge) is intentionally insecure and must not be used to deploy. Real deployment uses the root `Dockerfile` (distroless, non-root UID 65532).

## Components
| Component | Covers |
|---|---|
| Web client | `frontend/` (Angular SPA) |
| API server | `server.ts`, `app.ts`, `routes/` (except those listed below), `models/`, `views/`, `lib/utils.ts`, `lib/webhook.ts` |
| Auth & accounts | `lib/insecurity.ts` (JWT RS256 with hard-coded private key, HMAC secret), `routes/login.ts`, `2fa.ts`, `passkey.ts`, `resetPassword.ts`, `changePassword.ts`, `securityQuestion.ts`, `currentUser.ts`, `authenticatedUsers.ts`, `saveLoginIp.ts`, `encryptionkeys/` |
| Files & uploads | `routes/fileServer.ts`, `fileUpload.ts`, `profileImageFileUpload.ts`, `profileImageUrlUpload.ts`, `logfileServer.ts`, `quarantineServer.ts`, `keyServer.ts`, `videoHandler.ts`, `memory.ts`, `dataExport.ts`, `ftp/`, `uploads/` |
| Challenge engine | `lib/challengeUtils.ts`, `lib/antiCheat.ts`, `lib/codingChallenges.ts`, `lib/accuracy.ts`, `routes/verify.ts`, `continueCode.ts`, `restoreProgress.ts`, `vulnCodeSnippet.ts`, `vulnCodeFixes.ts`, `countryMapping.ts`, `data/static/challenges.yml`, `data/static/codefixes/`, `rsn/`, `ctf.key` |
| Startup & data | `lib/startup/`, `data/` (datacreator, static seed data), `config/`, `lib/config.schema.ts` |
| Infrastructure & build | `Dockerfile`, `infrastructure/`, `terraform/`, `.github/workflows/`, `vagrant/`, `monitoring/`, `docker-compose.test.yml` |

## Trust boundaries and entry points
- Browser to server over HTTP on port 3000: all `routes/`, auto-generated REST (`/api/*` via finale), `/rest/*`, `/ftp`, `/encryptionkeys`, `/support/logs`, `/metrics`, `/.well-known`, Socket.IO events (`lib/startup/registerWebsocketEvents.ts`). Reachable by anyone who can reach the port; many routes are unauthenticated by design. Roles: customer, deluxe, accounting, admin (JWT claims).
- Server to host: file system writes (uploads, logs), XML/YAML parsing, sandboxed eval (`vm`/`notevil`) used by injection challenges. "Safety mode" (`config/default.yml` `challenges.safetyMode`, `lib/utils.ts getChallengeEnablementStatus`) disables the most dangerous challenges (RCE-style, `disabledEnv`) on Docker/Heroku or when enabled.
- CI/CD (`.github/workflows/`): GitHub Actions with repository secrets; triggered by pushes/PRs.

## Assets
- The host machine running Juice Shop (the only real asset if code execution escapes the app).
- CI/CD secrets and the GitHub repository (supply chain).
- Seed users, cards, keys and the CTF key are fake training data by design.
- Challenge integrity (scores, CTF flags) matters only in a hosted CTF.

## Attackers
- Training participants: expected to exploit the deliberate challenges.
- Anyone on the network that can reach the port, if exposed.
- Malicious PR authors / dependency supply chain against CI.

## Existing controls
- Distroless, non-root Docker image; safety mode for dangerous challenges; `denyAll()` / `isAuthorized()` route guards in `server.ts`; CodeQL workflow.

## Deployment **(user)**
- Juice Shop runs only on Jonah's own computer, for practice. It is not hosted for others or exposed to the internet.

## Priorities **(user)**
- Deliberate hacking/coding-challenge vulnerabilities are to be treated as real problems at full severity; they are **not** accepted risk. (Jonah chose this despite running locally only, so the local-only deployment does not lower findings either.)

## Out of scope / accepted risk **(user)**
- `infrastructure/`, `infrastructure/terraform/` and root `terraform/`: Jonah does not deploy anything from them. Findings that only matter if these files are used to deploy real infrastructure are not worth fixing.

## Open questions
- None outstanding. Which assets matter most beyond the defaults above has not been stated.
