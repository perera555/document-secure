// Tells open copies of the app which version is currently deployed.
export async function GET() {
  return Response.json(
    { version: process.env.NEXT_PUBLIC_BUILD_ID },
    { headers: { "cache-control": "no-store, max-age=0" } },
  );
}
