if (!DISCORD_CLIENT_ID) {
    return res.status(500).json({
        error: "DISCORD_CLIENT_ID is missing"
    });
}

if (!DISCORD_CLIENT_SECRET) {
    return res.status(500).json({
        error: "DISCORD_CLIENT_SECRET is missing"
    });
}

if (!DISCORD_REDIRECT_URI) {
    return res.status(500).json({
        error: "DISCORD_REDIRECT_URI is missing"
    });
}
