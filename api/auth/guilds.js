function parseCookies(cookieHeader = "") {
    const cookies = {};

    cookieHeader.split(";").forEach(part => {
        const index = part.indexOf("=");

        if (index === -1) return;

        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();

        cookies[key] = decodeURIComponent(value);
    });

    return cookies;
}

export default async function handler(req, res) {
    try {
        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }

        const cookies = parseCookies(
            req.headers.cookie || ""
        );

        const sessionCookie =
            cookies.oxelon_session;

        if (!sessionCookie) {
            return res.status(401).json({
                error: "Not authenticated"
            });
        }

        let session;

        try {
            session = JSON.parse(
                Buffer.from(
                    sessionCookie,
                    "base64url"
                ).toString("utf8")
            );
        } catch {
            return res.status(401).json({
                error: "Invalid session"
            });
        }

        if (
            !session.access_token ||
            !session.expires_at ||
            Date.now() >= session.expires_at
        ) {
            return res.status(401).json({
                error: "Discord session expired"
            });
        }

        const response = await fetch(
            "https://discord.com/api/users/@me/guilds",
            {
                headers: {
                    Authorization:
                        `Bearer ${session.access_token}`
                }
            }
        );

        const guilds = await response.json();

        if (!response.ok) {
            console.error(
                "Discord guild error:",
                guilds
            );

            return res.status(response.status).json({
                error:
                    guilds.message ||
                    "Unable to retrieve Discord servers."
            });
        }

        /*
         * Discord permissions:
         *
         * 0x8 = Administrator
         * 0x20 = Manage Guild
         *
         * Only show servers where the user can
         * actually configure Oxelon.
         */

        const manageableGuilds = guilds
            .filter(guild => {
                const permissions =
                    BigInt(guild.permissions || "0");

                const ADMINISTRATOR = 8n;
                const MANAGE_GUILD = 32n;

                return (
                    (permissions & ADMINISTRATOR) !== 0n ||
                    (permissions & MANAGE_GUILD) !== 0n
                );
            })
            .map(guild => ({
                id: guild.id,
                name: guild.name,

                icon: guild.icon
                    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${guild.icon.startsWith("a_") ? "gif" : "png"}?size=128`
                    : null,

                owner: Boolean(guild.owner),

                permissions:
                    guild.permissions
            }));

        return res.status(200).json({
            guilds: manageableGuilds
        });

    } catch (error) {
        console.error(
            "Guild endpoint crashed:",
            error
        );

        return res.status(500).json({
            error: "Failed to load Discord servers."
        });
    }
}
