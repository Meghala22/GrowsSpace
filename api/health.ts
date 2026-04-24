export default function handler() {
  return Response.json({
    success: true,
    data: {
      status: "ok",
      service: "growspace-vercel-health",
      timestamp: new Date().toISOString(),
    },
  });
}
