function parseCookies(cookieHeader = "") {
    const cookies = {};

    cookieHeader.split(";").forEach(part => {
        const index = part.indexOf("=");

        if (index === -1) return;

        const key = part
            .slice(0, index)
            .trim();

        const value = part
            .slice(index + 1)
            .trim();

        try {
            cookies[key] =
                decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    });

    return cookies;
}


function getDiscordAvatar(user) {
    if (!user) {
        return null;
    }

    if (!user.avatar) {
        return null;
    }

    const extension =
        user.avatar.startsWith("a_")
            ? "gif"
            : "png";

    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=128`;
}


function getGuildIcon(guild) {
    if (!guild.icon) {
        return null;
    }

    const extension =
        guild.icon.startsWith("a_")
            ? "gif"
            : "png";

    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${extension}?size=128`;
}


export default async function handler(req, res) {

    try {

        // =====================================================
        // METHOD
        // =====================================================

        if (req.method !== "GET") {
            return res.status(405).json({
                error: "Method not allowed"
            });
        }


        // =====================================================
        // READ SESSION COOKIE
        // =====================================================

        const cookies =
            parseCookies(
                req.headers.cookie || ""
            );

        const sessionCookie =
            cookies.oxelon_session;


        if (!sessionCookie) {

            return res.status(401).json({
                error: "Not authenticated"
            });

        }


        // =====================================================
        // DECODE SESSION
        // =====================================================

        let session;

        try {

            session = JSON.parse(
                Buffer.from(
                    sessionCookie,
                    "base64url"
                ).toString("utf8")
            );

        } catch (error) {

            console.error(
                "Invalid Oxelon session:",
                error
            );

            return res.status(401).json({
                error: "Invalid session"
            });

        }


        // =====================================================
        // CHECK SESSION
        // =====================================================

        if (
            !session.access_token ||
            !session.expires_at
        ) {

            return res.status(401).json({
                error: "Invalid Discord session"
            });

        }


        if (
            Date.now() >=
            Number(session.expires_at)
        ) {

            return res.status(401).json({
                error: "Discord session expired"
            });

        }


        // =====================================================
        // GET DISCORD USER
        // =====================================================

        const userResponse =
            await fetch(
                "https://discord.com/api/users/@me",
                {
                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`
                    }
                }
            );


        const user =
            await userResponse.json();


        if (!userResponse.ok) {

            console.error(
                "Discord user request failed:",
                user
            );

            return res.status(401).json({
                error: "Discord session is no longer valid"
            });

        }


        // =====================================================
        // GET DISCORD GUILDS
        // =====================================================

        const guildResponse =
            await fetch(
                "https://discord.com/api/users/@me/guilds",
                {
                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`
                    }
                }
            );


        const guilds =
            await guildResponse.json();


        if (!guildResponse.ok) {

            console.error(
                "Discord guild request failed:",
                guilds
            );

            return res.status(
                guildResponse.status
            ).json({
                error:
                    guilds.message ||
                    "Unable to retrieve Discord servers."
            });

        }


        // =====================================================
        // FILTER MANAGEABLE SERVERS
        // =====================================================

        const manageableGuilds =
            guilds
                .filter(guild => {

                    let permissions;

                    try {

                        permissions =
                            BigInt(
                                guild.permissions || "0"
                            );

                    } catch {

                        permissions = 0n;

                    }


                    const ADMINISTRATOR =
                        8n;

                    const MANAGE_GUILD =
                        32n;


                    return (
                        (permissions &
                            ADMINISTRATOR) !== 0n ||
                        (permissions &
                            MANAGE_GUILD) !== 0n
                    );

                })
                .map(guild => ({

                    id: guild.id,

                    name:
                        guild.name,

                    icon:
                        getGuildIcon(guild),

                    owner:
                        Boolean(guild.owner),

                    permissions:
                        guild.permissions,

                    features:
                        Array.isArray(guild.features)
                            ? guild.features
                            : []

                }));


        // =====================================================
        // RESPONSE
        // =====================================================

        return res.status(200).json({

            user: {

                id:
                    user.id,

                username:
                    user.username,

                global_name:
                    user.global_name ||
                    null,

                avatar:
                    getDiscordAvatar(user)

            },

            guilds:
                manageableGuilds

        });


    } catch (error) {

        console.error(
            "Oxelon guild endpoint crashed:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to load Discord servers."
        });

    }

}
