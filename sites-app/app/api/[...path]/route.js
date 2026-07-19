export const dynamic = "force-dynamic";

async function proxyApiRequest(request, context) {
  const segments = (await context.params).path || [];
  const incomingUrl = new URL(request.url);
  const target = new URL(`/api/${segments.join("/")}`, "https://porschik.vercel.app");
  target.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("oai-sites-authorization");

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer(),
    redirect: "manual"
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: upstream.headers
  });
}

export const GET = proxyApiRequest;
export const POST = proxyApiRequest;
export const DELETE = proxyApiRequest;
