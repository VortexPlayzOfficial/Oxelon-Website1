```javascript
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
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const session = getSession(req);

        if (!session?.user?.id) {
            return res.status(401).json({
                error: "You must be logged into Discord."
            });
        }

        const client = await clientPromise;

        const db = client.db(
            process.env.MONGODB_DB || "oxelon"
        );

        const links = db.collection("roblox_links");

        const link = await links.findOne({
            discordId: String(session.user.id)
        });

        if (!link || !link.robloxId) {
            return res.status(200).json({
                linked: false
            });
        }

        return res.status(200).json({
            linked: true,
            robloxId: link.robloxId,
            robloxUsername:
                link.robloxUsername || null,
            linkedAt:
                link.linkedAt || null
        });

    } catch (error) {
        console.error(
            "[Oxelon Roblox] Status error:",
            error
        );

        return res.status(500).json({
            error:
                "Unable to retrieve Roblox link status."
        });
    }
}
```
