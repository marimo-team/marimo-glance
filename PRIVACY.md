# Privacy Policy

_Last updated: 2026-11-25_

marimo Glance is an official marimo extension that renders marimo notebooks inline on code-hosting sites. It is built and maintained by the marimo team, and it is designed so that your data stays on your machine. This policy describes exactly what the extension reads, what it sends, and what it does not.

## Summary

marimo Glance does not collect, store, transmit, or sell personal data. It has no accounts and does not track you across sites or over time. The notebook you preview never leaves your browser as readable content, and previewing never tells us which repository or file you are viewing. The only signal a preview sends to a marimo server is a fixed tag identifying the extension as its source, which the marimo team counts for aggregate usage — it says nothing about you. The one exception is a button you click yourself: "Open in molab" opens the notebook's URL in molab, as described below.

## What the extension reads

When you visit a page on github.com, gist.github.com, or gitlab.com, the extension reads the page to detect marimo notebooks (and, on github.com, Jupyter `.ipynb` notebooks) and, when you opt in to a preview, fetches the notebook's raw source. This happens entirely inside your browser. On gitlab.com the raw source is fetched from the same origin using your existing session, which is how previews work for private repositories; that request goes to gitlab.com and nowhere else.

The extension runs on github.com, gist.github.com, and gitlab.com from install, and fetches raw source from raw.githubusercontent.com and gist.githubusercontent.com. It runs on any other site only after you enable that site from the extension popup and grant your browser's permission prompt: colab.research.google.com, to offer Jupyter notebooks in molab, or a self-hosted GitHub or GitLab instance, to preview marimo notebooks. You can disable a site again from the popup or your browser's extension settings. It does not read or run on any site you have not enabled.

## What is sent to marimo.app

To render a notebook, the extension loads the marimo playground at `https://marimo.app` — also operated by the marimo team — in a sandboxed iframe. Two things determine what that server can see:

- **The notebook source is placed in the URL fragment** (the part after `#`). Browsers never transmit the fragment to a server, so the marimo.app server never receives your notebook's code. The code is decoded and executed by the in-browser runtime on your machine.
- **The request carries only two non-personal query values:** a fixed attribution tag (`ref=marimo-glance:github`, `:gist`, or `:gitlab`; a self-hosted instance reports its platform) and your light/dark theme preference. The `ref` tag identifies the extension and which surface (GitHub, gist, or GitLab) the preview came from, and the marimo team uses it for aggregate analytics — counting how many previews the extension drives. It contains no identifier for you, your notebook, or the page you were on.

The iframe's referrer is stripped (`no-referrer`), so marimo.app is not told which page, repository, or file you were viewing.

See the [marimo website](https://marimo.io) for marimo.app's own terms and privacy practices.

## Opening Jupyter notebooks in molab

On a Jupyter `.ipynb` notebook in a public github.com repository, or on a GitHub-backed notebook on colab.research.google.com once you have enabled Colab, the extension shows an "Open in molab" button. It is a plain link: nothing is sent anywhere until you click it, and the extension itself makes no request.

Clicking opens `https://molab.marimo.io/<the notebook's URL>` in a new tab. molab is operated by the marimo team, so it learns the notebook URL you chose to open, and it fetches and converts that notebook itself. Query strings and fragments are not included. Like any site you visit, molab also receives your molab cookies with that request, so if you are signed in to molab it can associate the URL with your account.

On github.com the button only appears when the page says the repository is public. Colab pages do not say, so on Colab the button can also appear for a notebook from a private GitHub repository; clicking it then sends that repository's owner, name, and file path to molab, which cannot import it.

## What is stored locally

The extension remembers whether you last chose the interactive or original view using your browser's `sessionStorage`. This preference lives only in your browser for the current session and is never transmitted anywhere.

If you dismiss the "Open in molab" button, the extension saves what you chose to hide in your browser's extension storage (`storage.local`): either that notebook's URL or the site's hostname, such as `github.com` (at most the 500 most recent of each). This keeps the button hidden, and the extension popup offers "Show again" for a hidden site. The same storage holds the self-hosted instances you have enabled and which platform each one runs. None of this is ever transmitted anywhere.

## What we do not do

- We do not collect names, emails, accounts, or any personal identifiers.
- We do not use cookies, fingerprinting, or per-user telemetry. The only usage signal is the `ref` tag described above, which counts previews by source, not by person.
- We do not track your browsing across sites or over time.
- We do not sell or share personal data, because we do not collect any.

## Permissions

At install, the extension requests:

- **Host access to github.com, gist.github.com, gitlab.com, raw.githubusercontent.com, and gist.githubusercontent.com**, to detect notebooks on those pages and fetch raw notebook source for previews.
- **`storage`**, for the dismissals and enabled sites described above.
- **`activeTab`**, so the popup can read the address of the tab you opened it on and offer to enable that site. It grants nothing until you open the popup, and only for that tab.
- **`scripting`** (Chrome only), to run the extension on sites you enable.

It may also ask for access to one more site at a time, only when you click "Enable" in the popup. It accesses no other sites.

## Changes to this policy

If the extension's data practices change, we will update this policy and its date, and note the change in the release notes.

## Contact

Questions about privacy can be sent to the marimo team at hello [at] marimo [dot] io, or raised as an issue on the [marimo-glance repository](https://github.com/marimo-team/marimo-glance).
