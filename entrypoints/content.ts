import { isMarimoNotebook, isPythonPath, renderNotebook } from '@/lib/marimo';

interface Ctx {
  isValid: boolean;
  requestAnimationFrame: (cb: () => void) => void;
  onInvalidated: (cb: () => void) => void;
}

export default defineContentScript({
  matches: ['*://github.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    // GitHub is a Turbo SPA: navigation events fire before the DOM swaps, so
    // watching the code-view node itself is more reliable than nav events. The
    // observer fires on both hard load and soft nav.
    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      ctx.requestAnimationFrame(() => {
        scheduled = false;
        void sync(ctx);
      });
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    ctx.onInvalidated(() => observer.disconnect());
    void sync(ctx);
  },
});

let injectedFor: HTMLElement | null = null;
let handledPath: string | null = null;
let teardown: (() => void) | null = null;

/**
 * Reconcile the page with our injection. Runs on every observer tick but does
 * real work only when the file changed, so repeated firing is cheap. Evaluating
 * per path (not per node) handles GitHub reusing the code-view node across
 * navigations, and re-injects if a same-page re-render wipes our nodes.
 */
async function sync(ctx: Ctx): Promise<void> {
  if (injectedFor && !injectedFor.isConnected) {
    teardown?.();
    teardown = null;
    injectedFor = null;
    handledPath = null;
  }

  const path = window.location.pathname;
  const isNotebookBlob = isPythonPath(path) && isBlobPath(path);
  if (!isNotebookBlob) {
    teardown?.();
    teardown = null;
    injectedFor = null;
    handledPath = null;
    return;
  }

  if (path === handledPath) return;
  const codeArea = findCodeArea();
  if (!codeArea) return;
  handledPath = path;

  const source = await fetchRawSource(path);
  const current = findCodeArea();
  if (!ctx.isValid || window.location.pathname !== path || !current) {
    handledPath = null;
    return;
  }
  if (source === null || !isMarimoNotebook(source)) return;

  const notebook = renderNotebook(source, { sourceUrl: rawUrlFor(path) });
  teardown?.();
  teardown = mount(notebook, current);
  injectedFor = current;
}

/** GitHub file-view paths look like `/owner/repo/blob/ref/path`. */
function isBlobPath(path: string): boolean {
  return path.includes('/blob/');
}

/** Convert a blob path (`/owner/repo/blob/ref/path`) to its raw URL. */
function rawUrlFor(path: string): string {
  return `https://github.com${path.replace('/blob/', '/raw/')}`;
}

async function fetchRawSource(path: string): Promise<string | null> {
  try {
    const response = await fetch(rawUrlFor(path));
    return response.ok ? await response.text() : null;
  } catch {
    return null;
  }
}

/**
 * The raw-code area is the `<section>` wrapping GitHub's source textarea, which
 * holds only the rendered code lines — swapping the notebook in for it leaves
 * the surrounding chrome (commit bar, toolbar, symbols) intact.
 */
function findCodeArea(): HTMLElement | null {
  const textarea = document.querySelector('#read-only-cursor-text-area');
  return textarea?.closest('section') ?? null;
}

/**
 * Mount the notebook in place of GitHub's code lines and return a cleanup
 * function that removes it and restores the source. The view toggle is added to
 * GitHub's own Code/Blame segmented control (see installToggle); toggling flips
 * `display`, so nothing is removed from GitHub's DOM.
 */
function mount(notebook: HTMLElement, codeArea: HTMLElement): () => void {
  codeArea.before(notebook);
  const stopFit = fitToViewport(notebook);
  const control = installToggle(notebook, codeArea);

  return () => {
    notebook.remove();
    control?.remove();
    codeArea.style.display = '';
    stopFit();
  };
}

/**
 * Size the notebook iframe to fill from its top edge down to the bottom of the
 * viewport, so it uses the remaining screen rather than overflowing a flat
 * `100vh`. Re-fits on resize; skips when hidden (a zero-height rect). Returns a
 * function that detaches the resize listener.
 */
function fitToViewport(notebook: HTMLElement): () => void {
  const iframe = notebook.querySelector('iframe');
  if (!iframe) return () => {};

  const fit = () => {
    const top = iframe.getBoundingClientRect().top;
    if (top <= 0) return;
    iframe.style.height = `${Math.max(400, Math.round(window.innerHeight - top))}px`;
  };
  fit();
  window.addEventListener('resize', fit);
  (notebook as FittableNotebook).gmvFit = fit;
  return () => window.removeEventListener('resize', fit);
}

type FittableNotebook = HTMLElement & { gmvFit?: () => void };

/** Find a visible link or button whose trimmed label matches exactly. */
function findByText(label: string): HTMLElement | null {
  const candidates = document.querySelectorAll<HTMLElement>('a, button');
  for (const el of candidates) {
    if (el.textContent?.trim() === label && el.offsetParent !== null) return el;
  }
  return null;
}

const VIEW_STORAGE_KEY = 'gmv-view';

function savedView(): 'notebook' | 'original' {
  return sessionStorage.getItem(VIEW_STORAGE_KEY) === 'original' ? 'original' : 'notebook';
}

/**
 * Add a Notebook/Original switch next to GitHub's Code/Blame control. GitHub's
 * segmented control is a `<ul>` of `<li><button>` with hashed CSS-module class
 * names, so its own item is cloned as a template to match the styling exactly
 * rather than reproducing the classes, which change between deploys.
 */
function installToggle(notebook: HTMLElement, codeArea: HTMLElement): HTMLElement | null {
  const blame = findByText('Blame');
  const list = blame?.closest<HTMLElement>('ul[data-component="SegmentedControl"]');
  const template = blame?.closest('li');
  if (!list || !template) {
    // No control to attach to: fall back to the stored view with no switch.
    applyView(notebook, codeArea, savedView() === 'notebook');
    return null;
  }

  const control = list.cloneNode(false) as HTMLElement;
  control.setAttribute('aria-label', 'marimo view');
  control.style.marginLeft = '8px';

  const notebookItem = buildItem(template, 'Notebook');
  const originalItem = buildItem(template, 'Original');
  control.append(notebookItem.item, originalItem.item);

  const select = (showNotebook: boolean) => {
    applyView(notebook, codeArea, showNotebook);
    setSelected(notebookItem, showNotebook);
    setSelected(originalItem, !showNotebook);
    sessionStorage.setItem(VIEW_STORAGE_KEY, showNotebook ? 'notebook' : 'original');
  };
  notebookItem.button.addEventListener('click', () => select(true));
  originalItem.button.addEventListener('click', () => select(false));

  list.after(control);
  select(savedView() === 'notebook');
  return control;
}

function applyView(notebook: HTMLElement, codeArea: HTMLElement, showNotebook: boolean): void {
  notebook.style.display = showNotebook ? '' : 'none';
  codeArea.style.display = showNotebook ? 'none' : '';
  if (showNotebook) {
    requestAnimationFrame(() => (notebook as FittableNotebook).gmvFit?.());
  }
}

interface ControlItem {
  item: HTMLElement;
  button: HTMLButtonElement;
}

/** Clone GitHub's segmented-control item as a labelled, handler-free button. */
function buildItem(template: Element, label: string): ControlItem {
  const item = template.cloneNode(true) as HTMLElement;
  const button = item.querySelector('button') as HTMLButtonElement;
  const text = item.querySelector<HTMLElement>('[data-text]');
  if (text) {
    text.textContent = label;
    text.dataset.text = label;
  }
  for (const el of [item, button]) {
    for (const name of el.getAttributeNames()) {
      if (name.startsWith('data-dashlane')) el.removeAttribute(name);
    }
  }
  return { item, button };
}

function setSelected({ item, button }: ControlItem, selected: boolean): void {
  item.toggleAttribute('data-selected', selected);
  button.setAttribute('aria-current', String(selected));
  button.style.setProperty('--separator-color', selected ? 'transparent' : 'var(--borderColor-default)');
}

