import assert from 'node:assert/strict';
import test from 'node:test';

import { isMarimoNotebook, playgroundUrl } from '../dist/index.js';

test('recognizes a marimo notebook', () => {
  const source = 'import marimo\n\napp = marimo.App()\n';

  assert.equal(isMarimoNotebook(source), true);
});

test('rejects Python that is not a marimo notebook', () => {
  const source = 'def greet(name: str) -> str:\n    return f"Hello, {name}"\n';

  assert.equal(isMarimoNotebook(source), false);
});

test('builds an embedded playground URL without losing the code hash', () => {
  const source = 'import marimo\napp = marimo.App()\n';
  const url = new URL(
    playgroundUrl(source, { ref: 'marimo-anywhere:github.com', theme: 'dark' }),
  );

  assert.equal(url.origin, 'https://marimo.app');
  assert.equal(url.searchParams.get('embed'), 'true');
  assert.equal(url.searchParams.get('ref'), 'marimo-anywhere:github.com');
  assert.equal(url.searchParams.get('theme'), 'dark');
  assert.ok(url.hash.startsWith('#code/'));
  assert.ok(url.hash.length > '#code/'.length);
});
