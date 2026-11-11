"use strict";

function setDiscordImage(image, source, fallback) {
  if (!source) {
    image.onload = image.onerror = null;
    image.hidden = true;
    image.removeAttribute("src");
    delete image.dataset.source;
    return;
  }
  if (image.dataset.source === source) return;
  image.dataset.source = source;
  image.onload = () => { image.hidden = false; };
  image.onerror = () => {
    image.onerror = null;
    if (fallback) image.src = fallback;
    else image.hidden = true;
  };
  image.src = source;
}

function renderDiscordProfile(user) {
  const userId = String(user.id || DISCORD_USER_ID);
  const avatar = document.querySelector("#discordAvatar img");
  const defaultIndex = user.discriminator && user.discriminator !== "0"
    ? Number(user.discriminator) % 5
    : Number((BigInt(userId) >> 22n) % 6n);
  const avatarSource = user.avatar
    ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(userId)}/${encodeURIComponent(user.avatar)}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=128`
    : `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
  setDiscordImage(avatar, avatarSource);
  const decoration = user.avatar_decoration_data;
  const decorationActive = decoration?.asset && (!decoration.expires_at || Number(decoration.expires_at) * 1000 > Date.now());
  setDiscordImage(document.getElementById("discordDecoration"), decorationActive
    ? `https://cdn.discordapp.com/avatar-decoration-presets/${encodeURIComponent(decoration.asset)}.png?size=128`
    : null);

  const badges = document.getElementById("discordBadges");
  const guild = user.primary_guild;
  const key = JSON.stringify([user.public_flags || 0, user.premium_type || 0, guild]);
  if (badges.dataset.profile === key) return;
  badges.dataset.profile = key;
  badges.replaceChildren();
  const publicBadges = [
    { flag: 1, label: "Discord Staff", asset: "48d5bdcffe9e7848067c2e187f1ef951", format: "svg" },
    { flag: 2, label: "Partnered Server Owner", asset: "34306011e46e87f8ef25f3415d3b99ca", format: "svg" },
    { flag: 4, label: "HypeSquad Events", asset: "e666a84a7a5ea2abbbfa73adf22e627b", format: "svg" },
    { flag: 8, label: "Bug Hunter Level 1", asset: "8353d89b529e13365c415aef08d1d1f4", format: "svg" },
    { flag: 64, label: "HypeSquad Bravery", src: "images/icons/discord-badges/hypesquad-bravery.svg" },
    { flag: 128, label: "HypeSquad Brilliance", asset: "011940fd013da3f7fb926e4a1cd2e618" },
    { flag: 256, label: "HypeSquad Balance", asset: "3aa41de486fa12454c3761e8e223442e" },
    { flag: 512, label: "Early Supporter", asset: "b802e9af134ff492276d94220e36ec5c", format: "svg" },
    { flag: 16384, label: "Bug Hunter Level 2", asset: "f599063762165e0d23e8b11b684765a8", format: "svg" },
    { flag: 131072, label: "Early Verified Bot Developer", asset: "4441e07fe0f46b3cb41b79366236fca6", format: "svg" },
    { flag: 262144, label: "Moderator Programs Alumni", asset: "c981e58b5ea4b7fedd3a643cf0c60564", format: "svg" },
    { flag: 4194304, label: "Active Developer", asset: "26c7a60fb1654315e0be26107bd47470", format: "svg" }
  ];
  const visibleBadges = [...publicBadges.filter(badge => Number(user.public_flags) & badge.flag), ...DISCORD_PROFILE_BADGES];
  if ([1, 2, 3].includes(user.premium_type) && !visibleBadges.some(badge => badge.id === "nitro")) {
    visibleBadges.push({ label: user.premium_type === 3 ? "Discord Nitro Basic" : "Discord Nitro", asset: "24d05f3b46a110e538674edbac0db4cd", format: "svg" });
  }
  for (const badge of visibleBadges) {
    const item = document.createElement("span");
    if (badge.tooltip) {
      item.dataset.tooltip = badge.tooltip;
      item.tabIndex = 0;
    } else {
      item.title = badge.label;
    }
    if (badge.id) item.dataset.badge = badge.id;
    const icon = document.createElement("img");
    icon.src = badge.src || (badge.format === "svg"
      ? `https://cdn.discordapp.com/assets/${badge.asset}.svg`
      : `https://cdn.discordapp.com/badge-icons/${badge.asset}.png`);
    icon.alt = badge.tooltip ? `${badge.label}: ${badge.tooltip}` : badge.label;
    icon.width = icon.height = badge.id === "orbs" ? 16 : 22;
    icon.onerror = () => { item.textContent = badge.label; };
    item.append(icon);
    badges.append(item);
  }
  if (guild?.identity_enabled && guild.tag && guild.identity_guild_id && guild.badge) {
    const item = document.createElement("span");
    item.className = "discord-guild-tag";
    item.title = "Discord server tag: " + guild.tag;
    const icon = document.createElement("img");
    icon.src = `https://cdn.discordapp.com/guild-tag-badges/${encodeURIComponent(guild.identity_guild_id)}/${encodeURIComponent(guild.badge)}.png?size=32`;
    icon.alt = "";
    icon.width = icon.height = 15;
    icon.onerror = () => { icon.hidden = true; };
    item.append(icon, document.createTextNode(guild.tag));
    badges.append(item);
  }
  badges.hidden = !badges.childElementCount;
}

let discordRequest = null;
let discordUpdatedAt = 0;

function setDiscordPresence(status, label) {
  const presence = document.getElementById("discordPresence");
  presence.className = "presence " + status;
  presence.setAttribute("aria-label", label);
  presence.title = label;
}

function unavailableDiscord(message) {
  setDiscordPresence("unknown", "Live status unavailable");
  const customStatus = document.getElementById("discordCustomStatus");
  customStatus.textContent = "";
  customStatus.hidden = true;
  const activity = document.getElementById("discordActivity");
  activity.textContent = navigator.onLine ? "Live status unavailable" : "No internet connection";
  activity.title = message;
}

async function updateDiscord() {
  if (!DISCORD_USER_ID || document.hidden || discordRequest) return;
  if (!navigator.onLine) {
    unavailableDiscord("No internet connection");
    return;
  }
  discordRequest = new AbortController();
  const timeout = setTimeout(() => discordRequest?.abort(), 10000);
  try {
    const response = await fetch(
      `https://api.lanyard.rest/v1/users/${encodeURIComponent(DISCORD_USER_ID)}`,
      { signal: discordRequest.signal, cache: "no-store" }
    );
    if (response.status === 404) {
      unavailableDiscord("Live presence is not connected to Lanyard");
      return;
    }
    if (!response.ok) throw new Error("Request failed");
    const result = await response.json();
    if (!result.success || !result.data) throw new Error("User unavailable");
    const data = result.data;
    const user = data.discord_user || {};
    renderDiscordProfile(user);
    const labels = { online: "Online", idle: "Idle", dnd: "Do not disturb", offline: "Offline" };
    const status = Object.hasOwn(labels, data.discord_status) ? data.discord_status : "unknown";
    document.getElementById("discordName").textContent = user.global_name || user.username || "Kenyka";
    document.getElementById("discordUsername").textContent = user.username ? "@" + user.username : "Discord";
    setDiscordPresence(status, labels[status] || "Unknown");
    const activities = data.activities || [];
    const custom = activities.find(item => item.type === 4);
    const customStatus = document.getElementById("discordCustomStatus");
    const emoji = custom?.emoji && !custom.emoji.id ? custom.emoji.name : "";
    const customText = status !== "offline" ? [emoji, custom?.state].filter(Boolean).join(" ") : "";
    customStatus.textContent = customText;
    customStatus.hidden = !customText;
    const activity = activities.find(item => item.type !== 4);
    let text = status === "offline" ? "Currently offline" : "No current activity";
    if (status !== "offline") {
      if (data.listening_to_spotify && data.spotify) {
        text = `Listening to ${data.spotify.song} · ${data.spotify.artist}`;
      } else if (activity) {
        const prefixes = { 0: "Playing", 1: "Streaming", 2: "Listening to", 3: "Watching", 5: "Competing in" };
        const name = [prefixes[activity.type], activity.name].filter(Boolean).join(" ");
        text = [name, activity.details, activity.state].filter(Boolean).join(" · ");
      }
    }
    document.getElementById("discordActivity").textContent = text;
    document.getElementById("discordActivity").title = text;
    discordUpdatedAt = Date.now();
  } catch {
    unavailableDiscord(navigator.onLine ? "Live status unavailable · retrying automatically" : "No internet connection");
  } finally {
    clearTimeout(timeout);
    discordRequest = null;
    fitScreens();
  }
}

updateDiscord();
setInterval(() => {
  if (discordUpdatedAt && Date.now() - discordUpdatedAt > 65000) {
    unavailableDiscord("Status is out of date · reconnecting");
  }
  updateDiscord();
}, 30000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    if (Date.now() - discordUpdatedAt > 65000) unavailableDiscord("Refreshing live status…");
    updateDiscord();
  }
});
window.addEventListener("online", updateDiscord);
window.addEventListener("offline", () => unavailableDiscord("No internet connection"));


