/*
  Oxelon Server Selector

  Replace fetchServers() with your authenticated Discord/Oxelon API call.
  Expected response:
  [
    { id: "123", name: "My Server", icon: "https://..." }
  ]
*/

const loading = document.getElementById("loading");
const servers = document.getElementById("servers");
const empty = document.getElementById("empty");
const retry = document.getElementById("retry");

function setState(state) {
  loading.hidden = state !== "loading";
  servers.hidden = state !== "servers";
  empty.hidden = state !== "empty";
}

async function fetchServers() {
  // Production example:
  // const response = await fetch("/api/discord/servers", {
  //   credentials: "include"
  // });
  // if (!response.ok) throw new Error("Failed to load servers");
  // return await response.json();

  // Demo data so the page works immediately.
  await new Promise(resolve => setTimeout(resolve, 1800));

  return [
    { id: "1", name: "Oxelon Systems", members: "Dashboard", icon: null },
    { id: "2", name: "Northwood County", members: "Management", icon: null },
    { id: "3", name: "Police Roleplay Community", members: "Management", icon: null }
  ];
}

function createServerCard(server) {
  const card = document.createElement("button");
  card.className = "server-card";
  card.type = "button";

  const icon = document.createElement("div");
  icon.className = "server-icon";

  if (server.icon) {
    const image = document.createElement("img");
    image.src = server.icon;
    image.alt = "";
    image.className = "server-icon";
    card.appendChild(image);
  } else {
    icon.textContent = server.name.charAt(0).toUpperCase();
    card.appendChild(icon);
  }

  const content = document.createElement("div");

  const name = document.createElement("p");
  name.className = "server-name";
  name.textContent = server.name;

  const meta = document.createElement("p");
  meta.className = "server-meta";
  meta.textContent = server.members || "Discord Server";

  content.appendChild(name);
  content.appendChild(meta);
  card.appendChild(content);

  card.addEventListener("click", () => {
    // Change this to your server dashboard route.
    window.location.href = `/dashboard.html?server=${encodeURIComponent(server.id)}`;
  });

  return card;
}

async function loadServers() {
  setState("loading");

  try {
    const data = await fetchServers();
    servers.innerHTML = "";

    if (!data.length) {
      setState("empty");
      return;
    }

    data.forEach(server => {
      servers.appendChild(createServerCard(server));
    });

    setState("servers");
  } catch (error) {
    console.error(error);
    setState("empty");
  }
}

retry.addEventListener("click", loadServers);
loadServers();
