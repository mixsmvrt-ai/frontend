import type { NextApiRequest, NextApiResponse } from "next";

// Proxy API route: forwards successful checkout capture events from the
// Next.js frontend to the FastAPI backend so it can write to Supabase.

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    return res.status(500).json({ error: "BACKEND_URL is not configured" });
  }

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, "")}/billing/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Failed to contact billing backend" });
  }
}
