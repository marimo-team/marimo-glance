import { Button } from "@/components/ui/button";
import { linkOutDismissals } from "@/link-out-dismissals";

/**
 * The way back from "Hide on all of <site>": without it the choice would be
 * permanent, with nowhere in the UI to undo it. Open tabs on the site pick up
 * the restore through the store, so the pill returns without a reload.
 */
export default function LinkOutRestore({ site }: { site: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    linkOutDismissals
      .isSiteDismissed(site)
      .then(setHidden)
      .catch((error: unknown) => {
        console.error("[marimo-glance] failed to read hidden sites", error);
      });
  }, [site]);

  if (!hidden) return null;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-primary/20 pt-1.5">
      <span className="text-muted-foreground">molab button hidden here</span>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => {
          linkOutDismissals
            .restoreSite(site)
            .then(() => setHidden(false))
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
