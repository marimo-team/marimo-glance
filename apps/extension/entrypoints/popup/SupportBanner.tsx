import { CircleCheck, CircleSlash, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Flavor, FLAVOR_LABELS, FLAVORS } from "@/enabled-hosts";
import { disableHost, enableHost } from "./enable-host";
import type { SiteSupport } from "./useSiteSupport";

const SITE_LABELS = {
  github: "GitHub",
  gist: "GitHub Gists",
  gitlab: "GitLab",
} as const;

const SHELL = "flex items-start gap-2 rounded-lg border px-3 py-2";
const ISSUES_URL = "https://github.com/marimo-team/marimo-glance/issues";

/**
 * States whether the extension is active on the current site, and offers to
 * enable it where it is not. The wording stays about the site rather than the
 * page: the check behind it is a hostname lookup, so it reads as supported on a
 * repo home page holding no notebook at all, and page-level wording there would
 * promise something this cannot know.
 */
export default function SupportBanner({
  support,
  onChange,
}: {
  support: SiteSupport;
  onChange: () => void;
}) {
  if (support.kind === "checking") {
    return (
      <div className={`${SHELL} text-muted-foreground`}>
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>Checking this tab…</span>
      </div>
    );
  }

  if (support.kind === "supported") {
    return (
      <div className={`${SHELL} border-primary/30 bg-primary/8`}>
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          <strong className="font-semibold">{SITE_LABELS[support.surface]}</strong> supported.
        </span>
      </div>
    );
  }

  if (support.kind === "enabled") {
    return (
      <div className={`${SHELL} flex-col border-primary/30 bg-primary/8`}>
        <div className="flex items-start gap-2">
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            <strong className="font-semibold">{FLAVOR_LABELS[support.flavor]}</strong> enabled on
            this site.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => {
            disableHost(support.origin)
              .catch((error: unknown) => {
                console.error("[marimo-glance] failed to disable host", error);
              })
              .finally(onChange);
          }}
        >
          Disable
        </Button>
      </div>
    );
  }

  if (support.kind === "unsupported") {
    if (support.origin === null) {
      return (
        <div className={`${SHELL} border-destructive/30 bg-destructive/8 text-muted-foreground`}>
          <CircleSlash className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span>Not supported. Works on GitHub, Gists, and GitLab.</span>
        </div>
      );
    }
    return <EnableForm origin={support.origin} tabId={support.tabId} onChange={onChange} />;
  }

  const exhaustive: never = support;
  return exhaustive;
}

function EnableForm({
  origin,
  tabId,
  onChange,
}: {
  origin: string;
  tabId: number | null;
  onChange: () => void;
}) {
  const [flavor, setFlavor] = useState<Flavor>("gitlab");

  return (
    <div className={`${SHELL} flex-col`}>
      <div className="flex items-start gap-2">
        <CircleSlash className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-muted-foreground">
          Not supported on <strong className="font-semibold">{new URL(origin).hostname}</strong>.
        </span>
      </div>

      <div className="mt-2 flex w-full items-center gap-2">
        <Select value={flavor} onValueChange={(next) => setFlavor(next as Flavor)}>
          <SelectTrigger className="h-8 flex-1" aria-label="Platform">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FLAVORS.map((option) => (
              <SelectItem key={option} value={option}>
                {FLAVOR_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8"
          onClick={() => {
            enableHost(origin, flavor, tabId)
              .catch((error: unknown) => {
                console.error("[marimo-glance] failed to enable host", error);
              })
              .finally(onChange);
          }}
        >
          Enable
        </Button>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Only self-hosted GitHub and GitLab sites are supported.{" "}
        <a
          className="text-primary hover:underline"
          href={ISSUES_URL}
          target="_blank"
          rel="noreferrer"
        >
          Request another platform
        </a>
        .
      </p>
    </div>
  );
}
