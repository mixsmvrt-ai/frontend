import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    return res.status(500).json({ error: "BACKEND_URL is not configured" });
  }

  const mode = typeof req.query.mode === "string" ? req.query.mode : "";
  const qs = mode ? `?mode=${encodeURIComponent(mode)}` : "";

  try {
    const upstream = await fetch(`${backendUrl.replace(/\/$/, "")}/studio/presets${qs}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "Failed to load presets",
        detail: text || `Upstream error ${upstream.status}`,
      });
    }

    try {
      const parsed = JSON.parse(text);
      return res.status(200).json(parsed);
    } catch {
      return res.status(502).json({ error: "Invalid preset response from backend" });
    }
  } catch (error) {
    return res.status(502).json({
      error: "Failed to contact backend",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
