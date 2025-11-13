// Redirect to Warpcast compose with share text
export default async function handler(req, res) {
  const shareText = "Check out BaseBoard - analyze your Base wallet activity";
  const appUrl = "https://baseboard-gamma.vercel.app";
  const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText + ": " + appUrl)}`;
  
  // Redirect to Warpcast compose page
  return res.redirect(307, warpcastUrl);
}

