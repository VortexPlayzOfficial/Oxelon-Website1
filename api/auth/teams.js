const GUILD_ID = "1446887482674122867";

const ROLE_SECTIONS = {
    "1454712715414081566": "Founder",
    "1454713007840956446": "Developer",
    "1462218835464687617": "Staff Team"
};

export default async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            error: "Method not allowed"
        });
    }

    const token = process.env.DISCORD_BOT_TOKEN;

    if (!token) {
        return res.status(500).json({
            error: "DISCORD_BOT_TOKEN is not configured"
        });
    }

    try {
        const response = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`,
            {
                headers: {
                    Authorization: `Bot ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            console.error(
                "Discord API error:",
                response.status,
                errorText
            );

            return res.status(response.status).json({
                error: "Failed to fetch Discord members"
            });
        }

        const members = await response.json();

        const team = members
            .filter(member =>
                member.roles?.some(role =>
                    ROLE_SECTIONS[role]
                )
            )
            .map(member => {
                const roleId = member.roles.find(
                    role => ROLE_SECTIONS[role]
                );

                const user = member.user;

                let avatar;

                if (user.avatar) {
                    avatar =
                        `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
                } else {
                    const discriminator =
                        Number(user.discriminator || 0);

                    avatar =
                        `https://cdn.discordapp.com/embed/avatars/${discriminator % 5}.png`;
                }

                return {
                    id: user.id,

                    username:
                        user.username,

                    display_name:
                        member.nick ||
                        user.global_name ||
                        user.username,

                    avatar,

                    roles: member.roles,

                    team_role:
                        ROLE_SECTIONS[roleId]
                };
            });

        return res.status(200).json({
            guild_id: GUILD_ID,
            members: team
        });

    } catch (error) {

        console.error(
            "Team API error:",
            error
        );

        return res.status(500).json({
            error: "Internal server error"
        });
    }
}
