# Security policy

Nivaasa handles community directories, visitor records, maintenance billing and payment metadata. Please treat security reports privately.

## Supported versions

| Version | Supported |
|---|---|
| 1.x | Yes |
| < 1.0 | No |

## Reporting a vulnerability

Use [GitHub Security Advisories](https://github.com/karthikmprakash/nivaasa/security/advisories/new). Do **not** open a public issue, discussion or pull request for a vulnerability.

Please include:

- The affected route, role, version or image tag.
- Reproduction steps or a proof of concept.
- The impact you believe it has.
- Any suggested fix, if you have one.

We aim to acknowledge reports within **72 hours** and to agree a disclosure timeline after triage. Please give us a reasonable window to ship a fix before publishing.

## In scope

- Authentication and session handling
- Tenant isolation between societies and memberships
- Role escalation (resident / admin / guard / accountant / portfolio owner)
- SQL injection, XSS, CSRF, SSRF and path traversal
- Unsafe file upload or document access
- Exposure of payment, invoice, resident or visitor data
- Secrets in the repository or container image

## Out of scope

- Findings that require a compromised server, browser or GitHub account.
- Spam or social-engineering reports without a technical vulnerability.
- Denial-of-service from unauthenticated traffic without a specific bypass.
- The deliberate demo behaviour: simulated payments and demo accounts.

## Safe harbour

We will not pursue legal action for good-faith research that stays within the scope above, avoids privacy violations and does not degrade service for other people. If in doubt, ask first via the advisory.
