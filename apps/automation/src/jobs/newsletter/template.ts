import type { CuratedDigest } from "../../gemini.js";
import type { VideoRow, HeadlineRow } from "./newsletterDb.js";

export interface ResolvedPick {
  title: string;
  url: string;
  sourceLabel: string;
  blurb: string;
}

// Maps Gemini's picks (type + index into the candidate lists it was shown)
// back to real URLs — a pick referencing a dropped/out-of-range index is
// silently skipped rather than breaking the whole send.
export function resolvePicks(digest: CuratedDigest, videos: VideoRow[], headlines: HeadlineRow[]): ResolvedPick[] {
  return digest.picks
    .map((pick): ResolvedPick | null => {
      if (pick.type === "video") {
        const v = videos[pick.index];
        if (!v) return null;
        return {
          title: v.title,
          url: `https://www.youtube.com/watch?v=${v.youtube_video_id}`,
          sourceLabel: v.channel_name ?? "Video",
          blurb: pick.blurb,
        };
      }
      const h = headlines[pick.index];
      if (!h) return null;
      return { title: h.title, url: h.link, sourceLabel: h.source ?? "Article", blurb: pick.blurb };
    })
    .filter((p): p is ResolvedPick => p !== null);
}

export function renderDigestEmail(digest: CuratedDigest, picks: ResolvedPick[], unsubscribeUrl: string): string {
  const items = picks
    .map(
      (p) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <a href="${escapeAttr(p.url)}" style="color:#16233f;font-weight:600;font-size:16px;text-decoration:none;">${escapeHtml(p.title)}</a>
          <div style="color:#6b7280;font-size:13px;margin-top:2px;">${escapeHtml(p.sourceLabel)}</div>
          <div style="color:#16233f;font-size:14px;margin-top:6px;">${escapeHtml(p.blurb)}</div>
        </td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,system-ui,sans-serif;">
    <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;padding:24px 16px;">
      <tr>
        <td>
          <h1 style="font-size:20px;margin:0 0 4px;color:#16233f;">Daily Anchor</h1>
          <p style="color:#6b7280;font-size:13px;margin:0 0 20px;">${escapeHtml(digest.intro)}</p>
          <table role="presentation" width="100%">${items}</table>
          <p style="color:#9ca3af;font-size:12px;margin-top:28px;">
            You're receiving this because you subscribed at Daily Anchor.
            <a href="${escapeAttr(unsubscribeUrl)}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(str: string): string {
  return escapeHtml(str).replace(/"/g, "&quot;");
}
