import { CircleCheck, CircleSlash } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Flavor, FLAVOR_LABELS, FLAVORS } from "@/enabled-hosts";
import type { Surface } from "@/hosts";
import { disableOrigin, enableOrigin } from "./enable-host";
import LinkOutRestore from "./LinkOutRestore";
import { ISSUES_URL } from "./links";
import type { SiteSupport } from "./site-support";

const RUNS_MARIMO = "Runs marimo notebooks (.py) in the page.";
const OPENS_JUPYTER = "Opens Jupyter notebooks (.ipynb) in molab.";

const SITES: Record<Surface, { label: string; description: string }> = {
  github: {
    label: "GitHub",
    description:
      "Runs marimo notebooks (.py) in the page, and opens Jupyter notebooks (.ipynb) in molab.",
  },
  gist: { label: "GitHub Gists", description: RUNS_MARIMO },
  gitlab: { label: "GitLab", description: RUNS_MARIMO },
  colab: { label: "Google Colab", description: OPENS_JUPYTER },
};

/**
 * States whether the extension is active on the current site, and offers to
 * enable it where it is not. The wording stays about the site rather than the
 * page: the check behind it is a hostname lookup, so it reads as active on a
 * repo home page holding no notebook at all, and page-level wording there would
 * promise something this cannot know.
 */
export default function SiteStatus({
  support,
  onChange,
}: {
  support: SiteSupport;
  onChange: () => void;
}) {
  switch (support.kind) {
    case "checking":
      return null;

    case "built-in": {
      const site = SITES[support.surface];
      return (
        <SiteCard active site={site.label}>
          <p className="text-muted-foreground">{site.description}</p>
          <LinkOutRestore site={support.hostname} />
        </SiteCard>
      );
    }

    case "opt-in": {
      const site = SITES[support.surface];
      const { origin, tabId } = support;
      if (!support.enabled) {
        return (
          <SiteCard
            active={false}
            site={site.label}
            action={
              <Button
                size="xs"
                onClick={() => settle(enableOrigin(origin, tabId, null), "enable", onChange)}
              >
                Enable
              </Button>
            }
          >
            <p className="text-muted-foreground">{site.description}</p>
          </SiteCard>
        );
      }
      return (
        <SiteCard
          active
          site={site.label}
          action={<DisableButton origin={origin} onChange={onChange} />}
        >
          <p className="text-muted-foreground">{site.description}</p>
          <LinkOutRestore site={new URL(origin).hostname} />
        </SiteCard>
      );
    }

    case "self-hosted":
      return (
        <SiteCard
          active
          site={new URL(support.origin).hostname}
          action={<DisableButton origin={support.origin} onChange={onChange} />}
        >
          <p className="text-muted-foreground">{RUNS_MARIMO}</p>
        </SiteCard>
      );

    case "unsupported":
      if (support.origin === null) {
        return (
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-muted-foreground">
            <CircleSlash className="size-4 shrink-0" aria-hidden />
            <span>Works on GitHub, GitLab, and Colab.</span>
          </div>
        );
      }
      return <EnableForm origin={support.origin} tabId={support.tabId} onChange={onChange} />;
  }
}

/** Run a permission change, then refresh the verdict whether or not it went through. */
function settle(task: Promise<unknown>, verb: "enable" | "disable", onChange: () => void): void {
  task
    .catch((error: unknown) => {
      console.error(`[marimo-glance] failed to ${verb} site`, error);
    })
    .finally(onChange);
}

/** The card for one site: whether the extension is active there, and what it does. */
function SiteCard({
  active,
  site,
  action,
  children,
}: {
  active: boolean;
  site: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const Icon = active ? CircleCheck : CircleSlash;
  return (
    <div
      className={
        active
          ? "flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2"
          : "flex flex-col gap-1 rounded-lg border px-3 py-2"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <Icon
            className={
              active ? "size-4 shrink-0 text-primary" : "size-4 shrink-0 text-muted-foreground"
            }
            aria-hidden
          />
          <span>
            {active ? "Active on " : "Not active on "}
            <strong className="font-semibold">{site}</strong>
          </span>
        </span>
        {action}
      </div>
      <div className="flex flex-col gap-1.5 pl-6">{children}</div>
    </div>
  );
}

function DisableButton({ origin, onChange }: { origin: string; onChange: () => void }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      onClick={() => settle(disableOrigin(origin), "disable", onChange)}
    >
      Disable
    </Button>
  );
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
    <SiteCard active={false} site={new URL(origin).hostname}>
      <div className="flex items-center gap-2">
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
          onClick={() => settle(enableOrigin(origin, tabId, flavor), "enable", onChange)}
        >
          Enable
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Self-hosted GitHub or GitLab only.{" "}
        <a
          className="text-primary hover:underline"
          href={ISSUES_URL}
          target="_blank"
          rel="noreferrer"
        >
          Request another
        </a>
      </p>
    </SiteCard>
  );
}
