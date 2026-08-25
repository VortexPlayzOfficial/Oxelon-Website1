import clientPromise from "../../lib/mongodb.js";

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const {
            robloxId,
            robloxUsername,
            verificationCode
        } = req.body || {};

        if (
            !robloxId ||
            !robloxUsername ||
            !verificationCode
        ) {
            return res.status(400).json({
                error:
                    "Roblox ID, username and verification code are required."
            });
        }

        const client = await clientPromise;

        const db = client.db(
            process.env.MONGODB_DB || "oxelon"
        );

        const links = db.collection("roblox_links");

        const pending = await links.findOne({
            verificationCode:
                String(verificationCode).toUpperCase(),
            verified: false
        });

        if (!pending) {
            return res.status(404).json({
                error:
                    "Invalid or expired verification code."
            });
        }

        if (
            pending.verificationExpiresAt &&
            new Date(pending.verificationExpiresAt) <
                new Date()
        ) {
            return res.status(410).json({
                error:
                    "This verification code has expired."
            });
        }

        /*
         * IMPORTANT:
         *
         * Do not mark the account as verified until
         * we have independently verified that the
         * supplied Roblox account belongs to the user.
         *
         * Roblox's public APIs do not provide a reliable,
         * supported endpoint for reading arbitrary profile
         * About/bio text.
         *
         * The actual Roblox-account verification step
         * therefore needs to be connected here once we
         * choose a supported verification method.
         */

        return res.status(501).json({
            error:
                "Roblox account verification is not connected yet.",
            message:
                "The verification code was found, but Oxelon has not independently verified ownership of this Roblox account."
        });

    } catch (error) {
        console.error(
            "[Oxelon Roblox] Verify error:",
            error
        );

        return res.status(500).json({
            error:
                "Unable to verify Roblox account."
        });
    }
}

