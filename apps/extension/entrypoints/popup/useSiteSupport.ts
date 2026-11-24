import { readActiveTabSupport, type SiteSupport } from "./site-support";

/**
 * The active tab's `SiteSupport` as popup state. Site-level only: an active
 * verdict means the extension runs on this origin, not that the current page
 * holds a notebook.
 *
 * Starts as `checking` rather than `unsupported` so the popup never shows a
 * verdict it has to take back once the lookups resolve.
 *
 * `refresh` re-runs the lookup, which the popup needs after enabling or
 * disabling a host — the verdict changes without the tab changing. Only the
 * latest request's result is applied, so concurrent requests do not cause races.
 */
export function useSiteSupport(): {
  support: SiteSupport;
  refresh: () => void;
} {
  const [support, setSupport] = useState<SiteSupport>({ kind: "checking" });
  const requestId = useRef(0);

  const refresh = useCallback(() => {
    const id = ++requestId.current;
    void readActiveTabSupport().then((result) => {
      if (id === requestId.current) setSupport(result);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { support, refresh };
}
