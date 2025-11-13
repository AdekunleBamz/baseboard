// Vercel serverless function for Farcaster webhook
export default async function handler(req, res) {
	// Accept GET for health checks and POST for event delivery
	if (req.method !== "GET" && req.method !== "POST") {
		res.setHeader("Allow", "GET, POST");
		return res.status(405).json({ ok: false, error: "Method Not Allowed" });
	}

	// Return success for Farcaster webhook validation
	// In production, you can verify signatures and handle events here
	return res.status(200).json({ ok: true, status: "ok" });
}


