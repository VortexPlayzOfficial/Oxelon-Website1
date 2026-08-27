export default function handler(req, res) {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri =
        "https://oxelonbot.vercel.app/api/auth/callback";

    if (!clientId) {
        return res.status(500).json({
            error: "DISCORD_CLIENT_ID is not configured."
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

    res.redirect(302, discordUrl);
}
