export default function App() {
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <img className="size-8 shrink-0" src="/icon/marimo.png" alt="marimo logo" />
        <h1 className="text-[15px] font-semibold">marimo Glance</h1>
      </div>
      <p className="mt-3 text-muted-foreground">
        See your marimo notebooks at a glance. Run them live on GitHub and gists, right in the page.
      </p>
      <div className="mt-3 rounded-lg border py-2.5 pr-3 pl-3.5">
        <h2 className="mb-1.5 text-xs font-semibold tracking-[0.04em] uppercase text-muted-foreground">
          How to use
        </h2>
        <ol className="list-decimal pl-4.5">
          <li className="my-1">
            Open a marimo <code>.py</code> notebook on GitHub or a gist.
          </li>
          <li className="my-1">
            Click the{" "}
            <strong className="font-semibold text-primary">Switch to interactive notebook</strong>{" "}
            pill that appears.
          </li>
          <li className="my-1">
            Run and edit it in your browser; click{" "}
            <strong className="font-semibold text-primary">See original</strong> to return to the
            source.
          </li>
        </ol>
      </div>
      <p className="mt-3 text-muted-foreground">
        Your code runs locally in WebAssembly and is never uploaded. The one exception is{" "}
        <strong>Open in molab</strong> from the notebook, which sends your code to molab servers.
      </p>
      <footer className="mt-3.5 flex gap-3.5 border-t pt-3">
        <a
          className="text-primary hover:underline"
          href="https://github.com/marimo-team/marimo-glance"
          target="_blank"
          rel="noreferrer"
        >
          Source code
        </a>
        <a
          className="text-primary hover:underline"
          href="https://github.com/marimo-team/marimo-glance/issues"
          target="_blank"
          rel="noreferrer"
        >
          Report an issue
        </a>
      </footer>
    </div>
  );
}
