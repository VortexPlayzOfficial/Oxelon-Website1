// api/auth/login.js

export default function handler(req, res) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");

        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    // Send the user into the Discord OAuth2 flow.
    return res.redirect(
        302,
        "/api/auth/discord"
    );
}
