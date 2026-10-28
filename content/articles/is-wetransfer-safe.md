---
title: Is WeTransfer Safe? What Happens to Your Files
description: WeTransfer encrypts files in transit and at rest, but not end to end, so it can read them. Its 2025 terms change, phishing scams, and safer options.
h1: Is WeTransfer safe?
category: Security
date: 2026-10-28
updated: 2026-10-28
order: 13
keywords: is wetransfer safe, wetransfer security, wetransfer encryption, wetransfer privacy, wetransfer scam, wetransfer ai terms, is wetransfer encrypted
related: relay-vs-wetransfer, wetransfer-alternative, secure-file-sharing, end-to-end-encrypted-file-transfer
---
**WeTransfer is safe for everyday files, but it is not end-to-end encrypted.** Files are encrypted while they travel (TLS) and while stored (AES-256), but WeTransfer holds the keys, so it could technically open them. For confidential files, use an end-to-end encrypted tool such as Relay, where only your two devices hold the keys.

## How WeTransfer protects files

- **In transit:** uploads and downloads use TLS, the same encryption as any HTTPS site.
- **At rest:** stored files are encrypted with AES-256.
- **Not end to end:** WeTransfer manages the encryption keys. Anyone who gets the download link can usually open the file, unless you're on a paid plan and add a password.

That's the same model as Google Drive or Dropbox: protected from outsiders, readable by the company.

## The 2025 terms of service row

In July 2025 WeTransfer updated its terms with a clause giving it a broad licence to uploaded content, including to train machine-learning models. After a public backlash it rewrote the clause within days: the licence now only covers running and improving the service, and the company said it does not use AI on customer content or sell it. Worth knowing because terms can change, and with any upload service you're trusting the company with a copy.

## Phishing: the bigger risk

Scammers copy WeTransfer's emails to steal passwords. Before clicking:

- Check the sender's address really ends in **@wetransfer.com**.
- Hover over the link to see where it goes.
- Be suspicious of a "transfer" you weren't expecting, or one that asks you to log in to download.

## Safer options for sensitive files

| | WeTransfer (free) | Relay |
|---|---|---|
| Encrypted in transit | Yes (TLS) | Yes (DTLS) |
| End-to-end encrypted | No | Yes |
| File stored on a server | Yes | No |
| Verify the recipient | No | Yes, [safety number](/verify-safety-number) |
| Free limit | 3 GB per 30 days | None |

Relay sends the file straight to the other device. Nothing is stored, so there's no copy to leak and no terms that could change what happens to it. The catch: both devices must be online at the same time. See [Relay vs WeTransfer](/relay-vs-wetransfer).

## FAQ

### Is WeTransfer encrypted?
Yes, in transit (TLS) and at rest (AES-256). It is not end-to-end encrypted, so WeTransfer can access stored files.

### Does WeTransfer use my files to train AI?
WeTransfer says no. A July 2025 terms update suggested it could, but the company rewrote the clause after the backlash.

### Is it safe to download from WeTransfer?
If you expected the transfer and the link really goes to wetransfer.com, yes. Treat unexpected transfer emails like any other possible phishing.

## Sources

- [Is WeTransfer safe? (Norton)](https://uk.norton.com/blog/online-scams/is-wetransfer-safe)
- [WeTransfer walks back clause that said it would train AI on your files (Malwarebytes, July 2025)](https://www.malwarebytes.com/blog/news/2025/07/wetransfer-walks-back-clause-that-said-it-would-train-ai-on-your-files)
- [WeTransfer: plan limits](https://wetransfer.com/help-center/subscriptions/plan-limits)
