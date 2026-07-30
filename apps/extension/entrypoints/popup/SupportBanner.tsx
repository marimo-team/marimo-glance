import { CircleCheck, CircleSlash, Info } from "lucide-react";
import type { SiteSupport } from "./useSiteSupport";

// Site names as the sites brand themselves, not the internal surface ids.
const SITE_LABELS = {
  github: "GitHub",
  gist: "GitHub Gists",
  gitlab: "GitLab",
} as const;

const SHELL = "flex items-start gap-2 rounded-lg border px-3 py-2";

/**
 * States whether the extension is active on the current site. The wording stays
 * about the site rather than the page: the check behind it is a hostname lookup,
 * so it reads as supported on a repo home page holding no notebook at all, and
 * page-level wording there would promise something this cannot know.
 */
export default function SupportBanner({ support }: { support: SiteSupport }) {
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

  return (
    <div className={`${SHELL} border-destructive/30 bg-destructive/8 text-muted-foreground`}>
      <CircleSlash className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <span>Not supported. Works on GitHub, Gists, and GitLab.</span>
    </div>
  );
}
