# @marimo/host-colab

Teaches the runtime which Google Colab notebooks molab can import. Colab already runs notebooks, so there is nothing to render in place: this package only exports a `NotebookLink`. Its only internal dependency is `@marimo/notebook-core`.

## What you can import

- `colabNotebookLink` recognizes GitHub-backed notebooks (`colab.research.google.com/github/<owner>/<repo>/blob/<ref>/<path>.ipynb`) and passes the Colab URL to molab unchanged, since molab resolves it itself.

## What it skips

- **Drive-backed notebooks** (`/drive/<id>`) are private by default, so the offer would mostly dead-end.
- **Private GitHub repositories** cannot be told apart from public ones on the page, so the pill still shows for them and molab's import fails. The extension's privacy policy says so.
