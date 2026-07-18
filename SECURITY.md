# Security Policy

Marimo Glance is a browser extension that renders marimo notebooks inline on code-hosting sites. Because it reads page source and injects UI into pages you visit, we take its security seriously.

## Supported Versions

We provide security patches for the latest published release only. We encourage all users to stay on the latest version.

## Reporting a Vulnerability

To report a security vulnerability, [please draft an advisory through
GitHub](https://github.com/marimo-team/marimo-glance/security/advisories/new), or
email the marimo team; security [at] marimo [dot] io.

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested mitigations if known

### What to Expect

- **Acknowledgement**: We will respond within 3 business days to confirm receipt
- **Triage**: We will assess severity and scope within 7 days
- **Patch & disclosure**: We aim to release a fix and publish an advisory simultaneously, typically within 90 days of the initial report

We will keep you informed throughout the process and credit you in the advisory unless you prefer to remain anonymous.

## Scope

This policy covers the Marimo Glance extension and the packages in this repository. Issues in marimo itself, the marimo.app playground, or molab should be reported through the [marimo security policy](https://github.com/marimo-team/marimo/security).

Please keep in mind how the extension handles code: notebook source is compressed into the page URL fragment and handed to the in-browser WASM runtime, which browsers never send to a server. Reports that demonstrate code leaving the machine unexpectedly are especially valuable.
