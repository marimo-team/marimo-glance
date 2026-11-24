import assert from "node:assert/strict";
import test from "node:test";

import { colabNotebookLink } from "../dist/index.js";

const NOTEBOOK =
  "https://colab.research.google.com/github/neosantara-xyz/examples/blob/main/cookbook/advanced/jev-decision-models.ipynb";

test("passes a GitHub-backed Colab notebook through, dropping query and hash", () => {
  assert.equal(
    colabNotebookLink.sourceUrl(new URL(`${NOTEBOOK}?authuser=1#scrollTo=abc`)),
    NOTEBOOK,
  );
});

test("ignores Drive-backed notebooks, which molab cannot fetch", () => {
  assert.equal(
    colabNotebookLink.sourceUrl(new URL("https://colab.research.google.com/drive/1AbC")),
    null,
  );
});

test("ignores Colab pages that are not a notebook file", () => {
  assert.equal(colabNotebookLink.sourceUrl(new URL("https://colab.research.google.com/")), null);
  assert.equal(
    colabNotebookLink.sourceUrl(
      new URL("https://colab.research.google.com/github/o/r/blob/main/readme.md"),
    ),
    null,
  );
});

test("ignores the same path on another origin", () => {
  assert.equal(
    colabNotebookLink.sourceUrl(
      new URL(NOTEBOOK.replace("colab.research.google.com", "example.com")),
    ),
    null,
  );
});
