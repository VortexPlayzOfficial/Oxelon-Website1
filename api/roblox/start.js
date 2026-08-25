import crypto from "crypto";
import clientPromise from "../../lib/mongodb.js";

function getSession(req) {
    const cookieHeader = req.headers.cookie || "";
    const cookies = {};

    for (const part of cookieHeader.split(";")) {
        const [key, ...value] = part.trim().split("=");

        if (key && value.length) {
            cookies[key] = decodeURIComponent(value.join("="));
        }
    }

    if (!cookies.oxelon_session) {
        return null;
    }

    try {
        return JSON.parse(
            Buffer.from(
                cookies.oxelon_session,
                "base64url"
            ).toString("utf8")
        );
    } catch {
        return null;
    }
}

export default async function handler(req, res) {
    try {
        if (req.method !== "GET" && req.method !== "POST") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const session = getSession(req);

        if (!session?.user?.id) {
            return res.status(401).json({
                error: "You must be logged into Discord first."
            });
        }

        const discordId = String(session.user.id);

        const client = await clientPromise;

        const db = client.db(
            process.env.MONGODB_DB || "oxelon"
        );

        const links = db.collection("roblox_links");

        const existing = await links.findOne({
            discordId
        });

        if (existing?.robloxId) {
            return res.status(200).json({
                success: true,
                alreadyLinked: true,
                robloxId: existing.robloxId,
                robloxUsername:
                    existing.robloxUsername || null
            });
        }

        const code =
            "OX-" +
            crypto
                .randomBytes(5)
                .toString("hex")
                .toUpperCase();

        const expiresAt =
            new Date(Date.now() + 10 * 60 * 1000);

        await links.updateOne(
            { discordId },
            {
                $set: {
                    discordId,
                    verificationCode: code,
                    verificationExpiresAt: expiresAt,
                    verified: false,
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        return res.status(200).json({
            success: true,
            alreadyLinked: false,
            code,
            expiresAt
        });

    } catch (error) {
        console.error(
            "[Oxelon Roblox] Start error:",
            error
        );

        return res.status(500).json({
            error: "Unable to create a Roblox verification code."
        });
    }
}

