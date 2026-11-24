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
import { disableHost, enableHost } from "./enable-host";
import type { SiteSupport } from "./useSiteSupport";

const SITE_LABELS = {
  github: "GitHub",
  gist: "GitHub Gists",
  gitlab: "GitLab",
  colab: "Google Colab",
} as const;

const SHELL = "flex items-center gap-2 rounded-lg border px-3 py-2";
const ISSUES_URL = "https://github.com/marimo-team/marimo-glance/issues";

/**
 * States whether the extension is active on the current site, and offers to
 * enable it where it is not. The wording stays about the site rather than the
 * page: the check behind it is a hostname lookup, so it reads as active on a
 * repo home page holding no notebook at all, and page-level wording there would
 * promise something this cannot know.
 */
export default function SiteStatus({
  support,
  description,
  onChange,
}: {
  support: SiteSupport;
  /** What the extension does here, shown inside the card when it is active. */
  description: string | null;
  onChange: () => void;
}) {
  if (support.kind === "checking") {
    return null;
  }

  if (support.kind === "supported") {
    return <ActiveCard site={SITE_LABELS[support.surface]} description={description} />;
  }

  if (support.kind === "enabled") {
    return (
      <ActiveCard
        site={new URL(support.origin).hostname}
        description={description}
        action={
          <Button
            variant="ghost"
            size="xs"
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
        }
      />
    );
  }

  if (support.kind === "unsupported") {
    if (support.origin === null) {
      return (
        <div className={`${SHELL} text-muted-foreground`}>
          <CircleSlash className="size-4 shrink-0" aria-hidden />
          <span>Works on GitHub, GitLab, and Colab.</span>
        </div>
      );
    }
    return <EnableForm origin={support.origin} tabId={support.tabId} onChange={onChange} />;
  }

  const exhaustive: never = support;
  return exhaustive;
}

function ActiveCard({
  site,
  description,
  action,
}: {
  site: string;
  description: string | null;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/8 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <CircleCheck className="size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Active on <strong className="font-semibold">{site}</strong>
          </span>
        </span>
        {action}
      </div>
      {description && <p className="pl-6 text-muted-foreground">{description}</p>}
    </div>
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
    <div className={`${SHELL} flex-col items-stretch`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <CircleSlash className="size-4 shrink-0" aria-hidden />
        <span>
          Not active on <strong className="font-semibold">{new URL(origin).hostname}</strong>
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2">
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
    </div>
  );
}
