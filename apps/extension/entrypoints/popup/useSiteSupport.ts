import { readActiveTabSupport, type SiteSupport } from "./site-support";

/**
 * The active tab's `SiteSupport`. Starts as `checking` rather than
 * `unsupported` so the popup never shows a verdict it has to take back.
 */
export function useSiteSupport(): {
  support: SiteSupport;
  refresh: () => void;
} {
  const [support, setSupport] = useState<SiteSupport>({ kind: "checking" });
  const latestRequest = useRef(0);

  const refresh = useCallback(() => {
    const request = ++latestRequest.current;
    void readActiveTabSupport().then((result) => {
      if (request === latestRequest.current) setSupport(result);
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { support, refresh };
}
