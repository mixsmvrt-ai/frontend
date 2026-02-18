import type { NextApiRequest, NextApiResponse } from "next";

interface GenerateUploadUrlBody {
  user_id?: string;
  filename?: string;
  content_type?: string;
  file_size_bytes?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const backendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    return res.status(500).json({ error: "BACKEND_URL is not configured" });
  }

  const body = (req.body || {}) as GenerateUploadUrlBody;

  if (!body.filename || !body.content_type) {
    return res.status(400).json({ error: "filename and content_type are required" });
  }

  // Keep compatibility with backend versions that require user_id.
  const payload = {
    user_id: body.user_id || "studio-anon",
    filename: body.filename,
    content_type: body.content_type,
    file_size_bytes: body.file_size_bytes,
  };

  try {
    const upstream = await fetch(`${backendUrl.replace(/\/$/, "")}/generate-upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { error: text || "Invalid backend response" };
    }

    if (!upstream.ok) {
      return res.status(upstream.status).json(parsed as object);
    }

    return res.status(200).json(parsed as object);
  } catch (error) {
    return res.status(502).json({
      error: "Failed to contact backend",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
