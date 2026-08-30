# MERIDIAN — Banking Operating System

Development plan and working interface prototype for a unified banking platform:
customers, accounts, an immutable double-entry ledger, payments with maker-checker,
financial close and audit — on one system.

**Live prototype:** https://anirudhatalmale6-alt.github.io/meridian-banking-os/

Sign in with the pre-filled operator ID and any password, then the authenticator
code **`123456`**.

---

## What's here

| Path | What it is |
|---|---|
| `index.html`, `assets/` | The interactive prototype. Open it directly — no build, no server, no dependencies |
| `docs/Banking-OS-Development-Plan-v1.0.pdf` | The development plan (27 pages) |
| `docs/Banking-OS-Development-Plan-v1.0.docx` | Same document in Word format |
| `docs/development-plan.md` | Source of the plan, in Markdown |
| `screenshots/` | Every screen, captured from the running prototype |

## The prototype

Nine screens, all working:

- **Sign-in + MFA** — two-step, TOTP second factor, device trust
- **Operations dashboard** — KPIs, an interactive 12-month trend chart, close progress, funding mix, exception queue
- **Customer 360** — register, full profile, KYC and risk state, exposure, linked accounts, document vault
- **Accounts & deposits** — account register and statement view
- **Payments** — queue with maker-checker enforced and visibly demonstrated
- **General ledger** — journal with a hash chain you can verify on demand
- **Financial close** — trial balance, task checklist, evidence upload, sign-off
- **Audit & security** — audit trail, control state, role matrix

Things that actually work rather than being pictures of working: the OTP step
rejects a wrong code, the chart gives per-month figures on hover, the hash chain
verifies entry by entry, approve/reject act on the payment queue, and the
payment created by the signed-in operator cannot be approved by them.

### Data integrity in the demonstration set

The numbers are synthetic but internally consistent, and this is checked rather
than assumed:

- The trial balance balances exactly — debits `₹5,64,85,19,00,000`, credits the same, difference zero
- Dashboard deposits and advances reconcile to the deposit and loan lines of that trial balance
- The CASA ratio is computed from those lines, not typed in
- Every journal entry's legs balance to zero
- Each entry's stored previous-hash equals the hash of the entry before it — the chain is continuous

There is no real customer, account, transaction or personal data anywhere in
this repository.

### Scope

Front end over a fixed dataset. No database, no server-side logic, no real
authentication — which is the correct scope for settling product and visual
direction before backend work begins. What a production build involves is
section 11 of the plan.

## The plan

27 pages covering: whether this is worth building and where the real
opportunity is; the product definition; module map with phase assignment;
architecture and stack; the PostgreSQL data model with the constraints that
enforce correctness; the security model for US and global requirements; API
design; roles and permissions; the interface rationale; phased delivery;
testing and acceptance criteria; team; and risks.

## Running it locally

Open `index.html` in a browser. That is the whole procedure — fonts are bundled,
nothing is fetched from a CDN, and there is no build step.

## Licence and attribution

Interface fonts (Archivo, Newsreader, JetBrains Mono) are bundled under the SIL
Open Font License 1.1.
