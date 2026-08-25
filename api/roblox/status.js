import clientPromise from "../../lib/mongodb.js";

function getSession(req) {
    try {
        const cookieHeader =
            req.headers?.cookie || "";

        const cookies = {};

        for (const part of cookieHeader.split(";")) {
            const trimmed = part.trim();

            if (!trimmed) continue;

            const separator =
                trimmed.indexOf("=");

            if (separator === -1) continue;

            const key =
                trimmed.substring(
                    0,
                    separator
                );

            const value =
                trimmed.substring(
                    separator + 1
                );

            cookies[key] =
                decodeURIComponent(value);
        }

        if (!cookies.oxelon_session) {
            return null;
        }

        return JSON.parse(
            Buffer
                .from(
                    cookies.oxelon_session,
                    "base64url"
                )
                .toString("utf8")
        );

    } catch (error) {
        console.error(
            "[Oxelon Roblox] Session error:",
            error
        );

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


        const session =
            getSession(req);


        if (!session?.user?.id) {

            return res.status(401).json({
                linked: false,
                error:
                    "You must be logged into Discord."
            });
        }


        if (!process.env.MONGODB_URI) {

            console.error(
                "[Oxelon Roblox] MONGODB_URI is missing."
            );

            return res.status(500).json({
                linked: false,
                error:
                    "MongoDB is not configured on the server."
            });
        }


        const client =
            await clientPromise;


        if (!client) {

            throw new Error(
                "MongoDB client was not created."
            );
        }


        const db =
            client.db(
                process.env.MONGODB_DB ||
                "oxelon"
            );


        const links =
            db.collection(
                "roblox_links"
            );


        const link =
            await links.findOne({
                discordId:
                    String(session.user.id)
            });


        if (!link) {

            return res.status(200).json({
                linked: false
            });
        }


        if (!link.robloxId) {

            return res.status(200).json({
                linked: false,
                pending: Boolean(
                    link.verificationCode
                )
            });
        }


        return res.status(200).json({

            linked: Boolean(
                link.verified
            ),

            robloxId:
                String(link.robloxId),

            robloxUsername:
                link.robloxUsername ||
                null,

            linkedAt:
                link.linkedAt ||
                null
        });


    } catch (error) {

        console.error(
            "[Oxelon Roblox] Status API error:",
            error
        );

        return res.status(500).json({
            linked: false,
            error:
                "Oxelon could not check your Roblox link status."
        });
    }
}
