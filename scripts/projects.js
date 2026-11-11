"use strict";

const projects = {
  apps: [
    {
      name: "Notter",
      stack: ["Next.js", "TypeScript", "Tailwind CSS", "Python", "FastAPI", "Prisma", "C++", "InAPI"],
      logo: "notter.png",

      description: "A streamlined place for notes, ideas, and thoughts, designed for focused writing without unnecessary clutter.",
      url: "https://notter.su",
      label: "notter.su",
      icon: "note"
    },
    {
      name: "Notter ToDo",
      stack: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma", "C++", "InAPI"],
      logo: "todo.png",

      description: "An uncluttered to-do workspace for tracking tasks, organizing priorities, and getting things done.",
      url: "https://todo.notter.su",
      label: "todo.notter.su",
      icon: "check"
    },
    {
      name: "QualCloud",
      stack: ["Next.js", "TypeScript", "Tailwind CSS", "Python", "FastAPI"],
      logo: "qualcloud.png",

      description: "A web-based space for storing, managing, and accessing files through a simple interface.",
      url: "https://cloud.qualsu.ru/",
      label: "cloud.qualsu.ru",
      icon: "cloud"
    },
    {
      name: "Q.AI",
      stack: ["Next.js", "TypeScript", "Tailwind CSS", "Python", "FastAPI"],
      logo: "qai.png",

      description: "An interface for exploring AI-assisted workflows and interacting with intelligent tools.",
      url: "https://qai.qualsu.ru/",
      label: "qai.qualsu.ru",
      icon: "bot"
    },
    {
      name: "GDKenyBot",
      stack: ["Python", "disnake"],
      logo: "gdkenybot.svg",
      description: "Geometry Dash notifications & utilities bot",
      url: "https://bot.thekeny.ru",
      label: "bot.thekeny.ru",
      icon: "bot"
    },
    {
      name: "Shrtl://",
      stack: ["Next.js", "TypeScript", "Tailwind CSS", "Python", "FastAPI"],
      logo: "shrtl.svg",

      description: "A lightweight utility that turns long URLs into short, convenient links for easy sharing.",
      url: "https://shrtl.ru/",
      label: "shrtl.ru",
      icon: "link"
    },
    {
      name: "SpiritLM",
      stack: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma"],
      logo: "spiritlm.png",
      description: "A platform for accessing AI models by API or subscribe",
      url: "https://spiritlm.netlify.app/",
      label: "spiritlm.netlify.app",
      icon: "bot"
    }
  ],
  opensource: [
    {
      name: "InSDL",
      stack: ["C++"],
      logo: "insdl.png",

      description: "A C++ framework built on SDL3, simplifying the creation of cross-platform graphics, games, and interactive applications.",
      url: "https://github.com/qualsu/insdl",
      label: "github.com/qualsu/insdl",
      icon: "cube"
    },
    {
      name: "InAPI",
      stack: ["C++"],
      logo: "inapi.png",

      description: "A C++ library for building HTTP servers with expressive FastAPI-like route declarations and a developer-friendly API.",
      url: "https://github.com/qualsu/inapi",
      label: "github.com/qualsu/inapi",
      icon: "code"
    },
    {
      name: "Kvllay",
      stack: ["C++"],
      logo: "kvllay.png",

      description: "An in-memory key-value store focused on efficient data storage and retrieval.",
      url: "https://thekeny.github.io/kvllay",
      label: "thekeny.github.io/kvllay",
      icon: "database"
    },
    {
      name: "Omi",
      stack: ["Python"],
      logo: "omi.png",

      description: "A programming-language experiment exploring syntax, language design, and developer tooling.",
      url: "https://omilang.fun/",
      label: "omilang.fun",
      icon: "code"
    },
    {
      name: "SunCheck",
      stack: ["TypeScript"],
      logo: "suncheck.png",

      description: "An interface utility that makes disabled actions explain why they are unavailable, improving user feedback.",
      url: "https://github.com/thekeny/SunCheck",
      label: "github.com/thekeny/SunCheck",
      icon: "sun"
    },
    {
      name: "MyNixUtils",
      stack: ["Python"],
      logo: "nix.webp",
      description: "A command-line utility (CLI) for simplified management of NixOS configuration and packages.",
      url: "https://github.com/thekeny/MyNixUtils",
      label: "github.com/thekeny/MyNixUtils",
      icon: "code"
    },
    {
      name: "SpiritCode",
      stack: ["Python"],
      logo: "spiritlm.png",
      description: "A terminal coding agent for SpiritLM with model switching, saved sessions and code change review.",
      url: "https://pypi.org/project/spiritcode/",
      label: "pypi.org/project/spiritcode",
      icon: "code"
    }
  ]
};

const stackStyles = {
  "Next.js": ["nextdotjs.svg", "#e5e5e5", "#303030"],
  "TypeScript": ["typescript.svg", "#75b5f5", "#172b40"],
  "Tailwind CSS": ["tailwindcss.svg", "#50d3ed", "#103039"],
  "Python": ["python.webp", "#f1d66e", "#332e19"],
  "FastAPI": ["fastapi2.webp", "#59d3bd", "#13332d"],
  "Prisma": ["prisma.svg", "#b2cde5", "#26313f"],
  "C++": ["cplusplus.svg", "#85b5e7", "#1c2d40"],
  "InAPI": ["../logos/inapi.png", "#77dfa0", "#173b29"],
  "disnake": ["discord.svg", "#a5adff", "#282b49"]
};

function renderStack(stack) {
  return `<div class="project-stack" aria-label="Technology stack">${stack.map(name => {
    const [icon, color, background] = stackStyles[name];
    return `<span class="stack-tag" style="--tag-color:${color};--tag-bg:${background}"><img src="images/stack/${icon}" alt="" width="11" height="11">${name}</span>`;
  }).join("")}</div>`;
}

const projectTones = {
  "Notter": "yellow", "Notter ToDo": "yellow", "SunCheck": "yellow",
  "QualCloud": "purple", "Omi": "purple",
  "Q.AI": "blue", "Shrtl://": "blue", "Kvllay": "blue", "MyNixUtils": "blue",
  "InSDL": "pink", "InAPI": "green"
};

function renderProjects(id, items) {
  const container = document.getElementById(id);

  container.innerHTML = items.map((project, index) => `
    <article
      class="project-card ${index === 0 ? "active" : ""}"
      data-tone="${projectTones[project.name] || "neutral"}"
      data-project="${project.name}"
      tabindex="0"
      aria-expanded="${index === 0}"
    >
      <div class="project-top">
        <div class="project-icon">
          ${project.logo
            ? `<img src="images/logos/${project.logo}" alt="" width="36" height="36">`
            : `<svg class="icon" aria-hidden="true"><use href="#i-${project.icon}"></use></svg>`}
        </div>
        <div class="project-label">
          <strong>${project.name}</strong>
        </div>
      </div>
      <div class="project-content">
        ${renderStack(project.stack)}
        ${project.description ? `<p>${project.description}</p>` : ""}
        <a
          class="project-link"
          tabindex="${index === 0 ? '0' : '-1'}"
          href="${project.url}"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${project.label}
          <svg class="icon"><use href="#i-external"></use></svg>
        </a>
      </div>
    </article>
  `).join("");

  const cards = [...container.querySelectorAll(".project-card")];

  function activate(card) {
    cards.forEach(item => {
      const selected = item === card;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-expanded", String(selected));
      item.querySelector(".project-link").tabIndex = selected ? 0 : -1;
    });

    requestAnimationFrame(fitScreens);
  }

  cards.forEach(card => {
    card.addEventListener("pointerenter", event => {
      if (event.pointerType === "mouse") activate(card);
    });

    card.addEventListener("click", event => {
      if (!event.target.closest("a")) activate(card);
    });

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activate(card);
      }
    });
  });
}

renderProjects("apps", projects.apps);
renderProjects("opensource", projects.opensource);

