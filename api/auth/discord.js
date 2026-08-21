export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;

    if (!clientId) {
        return res.status(500).json({
            error: "DISCORD_CLIENT_ID is not configured in Vercel."
        });
    }

    if (!redirectUri) {
        return res.status(500).json({
            error: "DISCORD_REDIRECT_URI is not configured in Vercel."
        });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "identify guilds"
    });

    const discordUrl =
        `https://discord.com/oauth2/authorize?${params.toString()}`;

    return res.redirect(302, discordUrl);
}
