# Privacy Policy

_Last updated: 2026-07-17_

marimo Glance is an official marimo extension that renders marimo notebooks inline on code-hosting sites. It is built and maintained by the marimo team, and it is designed so that your data stays on your machine. This policy describes exactly what the extension reads, what it sends, and what it does not.

## Summary

marimo Glance does not collect, store, transmit, or sell personal data. It has no accounts and does not track you across sites or over time. The notebook you preview never leaves your browser as readable content, and we never learn which repository or file you are viewing. The only signal that reaches a marimo server is a fixed tag identifying the extension as the source of a preview, which the marimo team counts for aggregate usage — it says nothing about you.

## What the extension reads

When you visit a page on github.com, gist.github.com, or gitlab.com, the extension reads the page to detect marimo notebooks and, when you opt in to a preview, fetches the notebook's raw source. This happens entirely inside your browser. On gitlab.com the raw source is fetched from the same origin using your existing session, which is how previews work for private repositories; that request goes to gitlab.com and nowhere else.

The extension only runs on the origins it declares in its permissions: github.com, gist.github.com, gitlab.com, and the raw-content hosts raw.githubusercontent.com and gist.githubusercontent.com. It does not read or run on any other site.

## What is sent to marimo.app

To render a notebook, the extension loads the marimo playground at `https://marimo.app` — also operated by the marimo team — in a sandboxed iframe. Two things determine what that server can see:

- **The notebook source is placed in the URL fragment** (the part after `#`). Browsers never transmit the fragment to a server, so the marimo.app server never receives your notebook's code. The code is decoded and executed by the in-browser runtime on your machine.
- **The request carries only two non-personal query values:** a fixed attribution tag (`ref=marimo-glance:github`, `:gist`, or `:gitlab`) and your light/dark theme preference. The `ref` tag identifies the extension and which surface (GitHub, gist, or GitLab) the preview came from, and the marimo team uses it for aggregate analytics — counting how many previews the extension drives. It contains no identifier for you, your notebook, or the page you were on.

The iframe's referrer is stripped (`no-referrer`), so marimo.app is not told which page, repository, or file you were viewing.

See the [marimo website](https://marimo.io) for marimo.app's own terms and privacy practices.

## What is stored locally

The extension remembers whether you last chose the interactive or original view using your browser's `sessionStorage`. This preference lives only in your browser for the current session and is never transmitted anywhere.

## What we do not do

- We do not collect names, emails, accounts, or any personal identifiers.
- We do not use cookies, fingerprinting, or per-user telemetry. The only usage signal is the `ref` tag described above, which counts previews by source, not by person.
- We do not track your browsing across sites or over time.
- We do not sell or share personal data, because we do not collect any.

## Permissions

The extension requests host permissions for github.com, gist.github.com, gitlab.com, raw.githubusercontent.com, and gist.githubusercontent.com. These are required to detect notebooks on those pages and to fetch raw notebook source for previews. It requests no other permissions and accesses no other sites.

## Changes to this policy

If the extension's data practices change, we will update this policy and its date, and note the change in the release notes.

## Contact

Questions about privacy can be sent to the marimo team at hello [at] marimo [dot] io, or raised as an issue on the [marimo-glance repository](https://github.com/marimo-team/marimo-glance).
