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
import { disableOrigin, enableKnownSite, enableSelfHosted } from "./enable-host";
import LinkOutRestore from "./LinkOutRestore";
import { ISSUES_URL } from "./links";
import type { SiteSupport } from "./site-support";

const RUNS_MARIMO = "Runs marimo notebooks inline.";
const OPENS_JUPYTER = "Opens Jupyter notebooks in molab.";

const SITES: Record<Surface, { label: string; description: string }> = {
  github: {
    label: "GitHub",
    description: "Runs marimo notebooks inline, and opens Jupyter notebooks in molab.",
  },
  gist: { label: "GitHub Gists", description: RUNS_MARIMO },
  gitlab: { label: "GitLab", description: RUNS_MARIMO },
  colab: { label: "Google Colab", description: OPENS_JUPYTER },
};

/**
 * Whether the extension is active on the current site, with a way to enable it
 * where it is not. The wording stays site-level: the check is a hostname lookup,
 * so it cannot know whether the page holds a notebook.
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

    case "built-in":
      return <KnownSite surface={support.surface} hostname={support.hostname} active />;

    case "opt-in": {
      const { origin } = support;
      return (
        <KnownSite
          surface={support.surface}
          hostname={new URL(origin).hostname}
          active={support.enabled}
          action={
            support.enabled ? (
              <DisableButton origin={origin} onChange={onChange} />
            ) : (
              <Button
                size="xs"
                aria-label={`Enable on ${SITES[support.surface].label}`}
                onClick={() => settle(enableKnownSite(origin), "enable", onChange)}
              >
                Enable
              </Button>
            )
          }
        />
      );
    }

    case "self-hosted":
      return (
        <SiteCard
          active
          site={new URL(support.origin).hostname}
          description={RUNS_MARIMO}
          action={<DisableButton origin={support.origin} onChange={onChange} />}
        />
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
      return <EnableForm origin={support.origin} onChange={onChange} />;
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

/** A site the extension knows by name. */
function KnownSite({
  surface,
  hostname,
  active,
  action,
}: {
  surface: Surface;
  hostname: string;
  active: boolean;
  action?: ReactNode;
}) {
  const site = SITES[surface];
  return (
    <SiteCard active={active} site={site.label} description={site.description} action={action}>
      {active && <LinkOutRestore site={hostname} />}
    </SiteCard>
  );
}

/**
 * The card for one site. The icon, title and description form one text column
 * with the action centered against it; `children` are extra rows underneath,
 * indented to line up with the text.
 */
function SiteCard({
  active,
  site,
  description,
  action,
  children,
}: {
  active: boolean;
  site: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}) {
  const Icon = active ? CircleCheck : CircleSlash;
  return (
    <div
      className={
        active
          ? "flex flex-col gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2"
          : "flex flex-col gap-1.5 rounded-lg border px-3 py-2"
      }
    >
      <div className="flex items-center gap-2">
        <Icon
          className={
            active
              ? "mt-0.5 size-4 shrink-0 self-start text-primary"
              : "mt-0.5 size-4 shrink-0 self-start text-muted-foreground"
          }
          aria-hidden
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span>
            {active ? "Active on " : "Not active on "}
            <strong className="font-semibold">{site}</strong>
          </span>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children && <div className="flex flex-col gap-1.5 pl-6">{children}</div>}
    </div>
  );
}

function DisableButton({ origin, onChange }: { origin: string; onChange: () => void }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className="-mr-1 px-1.5"
      aria-label={`Disable on ${new URL(origin).hostname}`}
      onClick={() => settle(disableOrigin(origin), "disable", onChange)}
    >
      Disable
    </Button>
  );
}

function EnableForm({ origin, onChange }: { origin: string; onChange: () => void }) {
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
          aria-label={`Enable on ${new URL(origin).hostname}`}
          onClick={() => settle(enableSelfHosted(origin, flavor), "enable", onChange)}
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
