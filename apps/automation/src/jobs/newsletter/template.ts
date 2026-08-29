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

export function renderDigestEmail(digest: CuratedDigest, picks: ResolvedPick[], unsubscribeUrl: string, dateLabel: string): string {
  const items = picks
    .map(
      (p, i) => `
      <tr>
        <td style="padding:18px 0;border-bottom:1px solid #e5e7eb;">
          <table role="presentation" width="100%">
            <tr>
              <td width="30" valign="top" style="padding-right:12px;">
                <div style="width:22px;height:22px;border-radius:50%;background:#16233f;color:#ffffff;font-size:12px;font-weight:700;text-align:center;line-height:22px;">${
                  i + 1
                }</div>
              </td>
              <td valign="top">
                <div style="color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;">${escapeHtml(
                  p.sourceLabel
                )}</div>
                <a href="${escapeAttr(p.url)}" style="color:#16233f;font-weight:600;font-size:16px;line-height:1.35;text-decoration:none;">${escapeHtml(
        p.title
      )}</a>
                <div style="color:#4b5563;font-size:14px;line-height:1.5;margin-top:6px;">${escapeHtml(p.blurb)}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join("");

  // Preheader: the preview snippet shown in an inbox list before the email
  // is opened. Gmail/Apple Mail pull it from the first visible text unless
  // one's given explicitly, which would otherwise be the (fairly generic)
  // brand name rather than today's actual intro.
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7fb;font-family:-apple-system,Segoe UI,system-ui,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(digest.intro)}</div>
    <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;padding:32px 16px;">
      <tr>
        <td>
          <table role="presentation" width="100%" style="margin-bottom:22px;">
            <tr>
              <td style="font-size:19px;font-weight:700;color:#16233f;">&#9875; Daily Anchor</td>
              <td align="right" style="color:#9ca3af;font-size:12px;white-space:nowrap;">${escapeHtml(dateLabel)}</td>
            </tr>
          </table>
          <p style="color:#374151;font-size:14px;line-height:1.5;margin:0 0 22px;">${escapeHtml(digest.intro)}</p>
          <table role="presentation" width="100%">${items}</table>
          <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin-top:28px;">
            You're receiving this because you subscribed at Daily Anchor.<br />
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
