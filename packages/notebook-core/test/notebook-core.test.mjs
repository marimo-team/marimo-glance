import assert from 'node:assert/strict';
import test from 'node:test';

import { isMarimoNotebook, isPythonPath, playgroundUrl } from '../dist/index.js';

test('recognizes a standard marimo notebook', () => {
  const source = 'import marimo\n\napp = marimo.App()\n';

  assert.equal(isMarimoNotebook(source), true);
});

test('tolerates whitespace around the app assignment', () => {
  const source = 'import marimo\n\napp   =   marimo.App()\n';

  assert.equal(isMarimoNotebook(source), true);
});

test('recognizes a type-annotated app declaration', () => {
  const source = 'import marimo\n\napp: marimo.App = marimo.App(width="medium")\n';

  assert.equal(isMarimoNotebook(source), true);
});

test('recognizes an aliased marimo import', () => {
  const source = 'import marimo as mo\n\napp = mo.App()\n';

  assert.equal(isMarimoNotebook(source), true);
});

test('rejects Python that is not a marimo notebook', () => {
  const source = 'def greet(name: str) -> str:\n    return f"Hello, {name}"\n';

  assert.equal(isMarimoNotebook(source), false);
});

test('rejects a comment that merely mentions marimo.App', () => {
  const source = '# app = marimo.App()\nprint("not a notebook")\n';

  assert.equal(isMarimoNotebook(source), false);
});

test('rejects a string literal that merely mentions marimo.App', () => {
  const source = 'note = "app = marimo.App()"\n';

  assert.equal(isMarimoNotebook(source), false);
});

test('rejects an app declaration nested inside a function', () => {
  const source = 'import marimo\n\ndef make():\n    app = marimo.App()\n    return app\n';

  assert.equal(isMarimoNotebook(source), false);
});

test('identifies Python paths by extension', () => {
  assert.equal(isPythonPath('notebooks/demo.py'), true);
  assert.equal(isPythonPath('README.md'), false);
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
