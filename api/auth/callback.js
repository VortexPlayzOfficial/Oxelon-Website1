export default async function handler(req, res) {
    try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const clientSecret = process.env.DISCORD_CLIENT_SECRET;
        const redirectUri = process.env.DISCORD_REDIRECT_URI;

        console.log("OAuth environment check:", {
            clientId: Boolean(clientId),
            clientSecret: Boolean(clientSecret),
            redirectUri: Boolean(redirectUri)
        });

        if (!clientId) {
            return res.status(500).json({
                error: "DISCORD_CLIENT_ID is missing from Vercel."
            });
        }

        if (!clientSecret) {
            return res.status(500).json({
                error: "DISCORD_CLIENT_SECRET is missing from Vercel."
            });
        }

        if (!redirectUri) {
            return res.status(500).json({
                error: "DISCORD_REDIRECT_URI is missing from Vercel."
            });
        }

        const code = req.query.code;

        if (!code) {
            return res.status(400).json({
                error: "Missing Discord OAuth code."
            });
        }

        // Continue with the rest of your callback...
