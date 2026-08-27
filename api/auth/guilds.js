import crypto from "crypto";

function decrypt(value, secret) {

    const key = crypto
        .createHash("sha256")
        .update(secret)
        .digest();

    const data =
        Buffer.from(
            value,
            "base64url"
        );

    const iv =
        data.subarray(0, 12);

    const tag =
        data.subarray(12, 28);

    const encrypted =
        data.subarray(28);

    const decipher =
        crypto.createDecipheriv(
            "aes-256-gcm",
            key,
            iv
        );

    decipher.setAuthTag(tag);

    return Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
    ]).toString("utf8");
}


export default async function handler(req, res) {

    const cookie =
        req.headers.cookie || "";

    const match =
        cookie.match(
            /oxelon_session=([^;]+)/
        );


    if (!match) {

        return res.status(401).json({
            error: "Not authenticated."
        });

    }


    try {

        const session =
            JSON.parse(
                decrypt(
                    match[1],
                    process.env.SESSION_SECRET
                )
            );


        const response =
            await fetch(
                "https://discord.com/api/v10/users/@me/guilds",
                {
                    headers: {
                        Authorization:
                            `Bearer ${session.access_token}`
                    }
                }
            );


        if (!response.ok) {

            return res.status(401).json({
                error:
                    "Discord session expired."
            });

        }


        const guilds =
            await response.json();


        /*
         * Discord permission:
         *
         * 0x20 = MANAGE_GUILD
         * 0x8  = ADMINISTRATOR
         */

        const manageable =
            guilds
                .filter(guild => {

                    const permissions =
                        BigInt(
                            guild.permissions || "0"
                        );

                    const manageGuild =
                        (permissions & 0x20n) !== 0n;

                    const administrator =
                        (permissions & 0x8n) !== 0n;

                    return (
                        manageGuild ||
                        administrator
                    );

                })
                .map(guild => {

                    return {
                        id:
                            guild.id,

                        name:
                            guild.name,

                        icon:
                            guild.icon
                                ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
                                : null
                    };

                });


        return res.status(200).json({
            guilds: manageable
        });


    } catch (error) {

        console.error(
            "Guild API error:",
            error
        );

        return res.status(500).json({
            error:
                "Failed to load Discord servers."
        });

    }
}
