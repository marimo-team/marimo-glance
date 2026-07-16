/**
 * Framework-agnostic rendering core: turn marimo notebook source into a DOM
 * subtree GitHub can display in place of the raw Python.
 *
 * This module intentionally has no React (or any framework) dependency. It is
 * the portable heart of the extension — the same logic could back a
 * refined-github feature, which mounts plain DOM rather than React.
 */
import { compressToEncodedURIComponent } from 'lz-string';

const PLAYGROUND_ORIGIN = 'https://marimo.app';

export interface RenderOptions {
  /** Public URL of the notebook, used for "open in" links and relative assets. */
  sourceUrl?: string;
}

/**
 * Build a marimo playground URL that boots the notebook from the source
 * compressed into the hash. `embed=true` hides the playground's header for a
 * clean embed; it coexists with the `#code/` hash (unlike some params, which
 * make the playground drop the hash and fall back to its demo notebook).
 */
export function playgroundUrl(source: string): string {
  const compressed = compressToEncodedURIComponent(source);
  return `${PLAYGROUND_ORIGIN}/?embed=true#code/${compressed}`;
}

/**
 * Build a DOM node rendering the notebook as an embedded playground iframe.
 * The iframe runs the notebook via marimo's WASM runtime, so no code executes
 * on GitHub's page and no notebook data leaves the browser.
 */
export function renderNotebook(source: string, options: RenderOptions = {}): HTMLElement {
  const container = document.createElement('div');
  container.className = 'gmv-notebook';

  const iframe = document.createElement('iframe');
  iframe.className = 'gmv-notebook__frame';
  iframe.src = playgroundUrl(source);
  iframe.title = 'marimo notebook';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = '0';
  container.append(iframe);

  if (options.sourceUrl) {
    const link = document.createElement('a');
    link.className = 'gmv-notebook__source-link';
    link.href = options.sourceUrl;
    link.textContent = 'View raw source';
    container.append(link);
  }

  return container;
}
