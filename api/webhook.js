export default async function handler(req, res) {
	// Accept GET for health checks and POST for event delivery
	if (req.method !== "GET" && req.method !== "POST") {
		res.setHeader("Allow", "GET, POST");
		return res.status(405).json({ ok: false, error: "Method Not Allowed" });
	}

	// Optionally log minimal info; avoid heavy processing for a stub
	// In production, verify signatures and handle events accordingly.
	return res.status(200).json({ ok: true });
}


