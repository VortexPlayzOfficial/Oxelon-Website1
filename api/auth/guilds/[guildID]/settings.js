import clientPromise from "../../../../lib/mongodb.js";

export default async function handler(req, res) {
    try {
        const { guildID } = req.query;

        if (!guildID) {
            return res.status(400).json({
                error: "Missing guild ID."
            });
        }

        const client = await clientPromise;

        const db = client.db("oxelon");

        const settings =
            db.collection("guild_settings");

        // ==============================
        // GET SETTINGS
        // ==============================

        if (req.method === "GET") {
            const existing =
                await settings.findOne({
                    guild_id: guildID
                });

            return res.status(200).json({
                guild_id: guildID,

                settings:
                    existing?.settings || {
                        spam_protection: false,
                        raid_protection: false,
                        welcome_messages: false,
                        logging: false
                    },

                premium:
                    existing?.premium || false,

                plan:
                    existing?.plan || "free"
            });
        }

        // ==============================
        // SAVE SETTINGS
        // ==============================

        if (req.method === "POST") {
            const body =
                req.body || {};

            const newSettings =
                body.settings || {};

            const premium =
                Boolean(body.premium);

            const plan =
                premium
                    ? "premium"
                    : "free";

            await settings.updateOne(
                {
                    guild_id: guildID
                },
                {
                    $set: {
                        guild_id: guildID,
                        settings: newSettings,
                        premium: premium,
                        plan: plan,
                        updated_at:
                            new Date()
                    }
                },
                {
                    upsert: true
                }
            );

            return res.status(200).json({
                success: true,
                guild_id: guildID,
                settings: newSettings,
                premium: premium,
                plan: plan
            });
        }

        return res.status(405).json({
            error: "Method not allowed."
        });

    } catch (error) {

        console.error(
            "Oxelon settings API error:",
            error
        );

        return res.status(500).json({
            error: "Failed to access server settings."
        });
    }
}
