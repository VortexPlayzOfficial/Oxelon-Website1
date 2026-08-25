export default async function handler(req, res) {
    return res.status(410).json({
        success: false,
        error:
            "Manual Roblox verification has been replaced by Roblox OAuth.",
        message:
            "Use /api/roblox/start to link your Roblox account."
    });
}
