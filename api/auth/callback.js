export default async function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    if (!clientId) {
        return res.status(500).json({
            error: "TEST: DISCORD_CLIENT_ID is missing"
        });
    }
    if (!clientSecret) {
        return res.status(500).json({
            error: "TEST: DISCORD_CLIENT_SECRET is missing"
        });
    }
    if (!redirectUri) {
        return res.status(500).json({
            error: "TEST: DISCORD_REDIRECT_URI is missing"
        });
    }
    if (!req.query.code) {
        return res.status(400).json({
            error: "TEST: Callback is working — no Discord code supplied"
        });
    }
    return res.status(200).json({
        success: true,
        message: "TEST: Discord callback and all environment variables are working."
    });
}
