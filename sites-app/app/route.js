import siteHtml from "../index.html?raw";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(siteHtml, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
