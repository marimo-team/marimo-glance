import { browser } from "wxt/browser";
import { Button } from "@/components/ui/button";
import { isSiteDismissed, restoreSite } from "@/link-out-dismissals";

/** The active tab's hostname when the viewer has hidden the molab pill on it. */
async function readHiddenHostname(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;

  const { hostname } = new URL(tab.url);
  return (await isSiteDismissed(hostname)) ? hostname : null;
}

/**
 * The way back from "Hide on all of <site>": without it the choice would be
 * permanent, with nowhere in the UI to undo it.
 */
export default function LinkOutRestore() {
  const [hostname, setHostname] = useState<string | null>(null);

  useEffect(() => {
    readHiddenHostname()
      .then(setHostname)
      .catch((error: unknown) => {
        console.error("[marimo-glance] failed to read hidden sites", error);
      });
  }, []);

  if (!hostname) return null;

  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5">
      <span className="text-muted-foreground">
        molab button hidden on <strong className="font-semibold">{hostname}</strong>
      </span>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          restoreSite(hostname)
            .then(() => setHostname(null))
            .catch((error: unknown) => {
              console.error("[marimo-glance] failed to restore the molab pill", error);
            });
        }}
      >
        Show again
      </Button>
    </div>
  );
}
