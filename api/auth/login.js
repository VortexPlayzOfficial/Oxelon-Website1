export default function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        // Send the user to the Discord OAuth endpoint.
        return res.redirect(
            302,
            "/api/auth/discord"
        );

    } catch (error) {

        console.error(
            "Oxelon login error:",
            error
        );

        return res.status(500).json({
            error: "Unable to start Discord login."
        });
    }
}
