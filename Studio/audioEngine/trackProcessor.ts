export type AnalyzeMixTrackRequest = {
  track_id: string;
  s3_key?: string | null;
  s3_url?: string | null;
  role: "lead_vocal" | "background_vocal" | "beat" | "bass" | "melody" | "drums";
};

export type AnalyzeMixPlugin = {
  plugin: string;
  params: Record<string, unknown>;
};

export type AnalyzeMixTrackResponse = {
  track_id: string;
  role: string;
  features: Record<string, number>;
  plugins: AnalyzeMixPlugin[];
};

export type AnalyzeMixResponse = {
  tracks: AnalyzeMixTrackResponse[];
  queue?: {
    position: number;
    estimated_wait: number;
  };
};

export async function requestAnalyzeMix(
  backendUrl: string,
  payload: {
    tracks: AnalyzeMixTrackRequest[];
    genre?: string | null;
    preset?: string | null;
  },
): Promise<AnalyzeMixResponse> {
  const response = await fetch(`${backendUrl}/analyze-mix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Analyze mix request failed with ${response.status}`);
  }

  return (await response.json()) as AnalyzeMixResponse;
}
