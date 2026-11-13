"use strict";

const prodProjects = [
  {
    event: "<strong>PROD '26</strong>",
    place: "Finalist",
    name: "BrandRadar",
    logo: "brandradar.png",
    description: "Brand mention monitoring with sentiment analysis, reputation metrics and real-time alerts.",
    repo: "Prod2026-BrandRadar",
    presentation: "brandradar.pdf"
  },
  {
    event: "PROD Hackathon<br><strong>Minsk</strong>",
    place: "4th place",
    name: "MeetPoint",
    logo: "meetpoint.png",
    description: "Event networking with participant profiles, contact requests and QR invitations.",
    repo: "Prodminsk-meetpoint",
    presentation: "meetpoint.pdf"
  },
  {
    event: "PROD Hackathon<br><strong>Saint Petersburg</strong>",
    place: "6th place",
    name: "MoverMate",
    logo: "movermate.png",
    description: "A moving planner to organize rooms, boxes, belongings and tasks in one place.",
    repo: "Prodspb-movermate",
    presentation: "movermate.pdf"
  },
  {
    event: "PROD Hackathon<br><strong>Kazan</strong>",
    place: "2nd place",
    name: "TravelHub",
    logo: "travelhub.png",
    hoverName: "Engine X 🥵",
    hoverLogo: "images/meimei.jpg",
    description: "A shared travel planner with itineraries, maps and trip materials, plus offline access.",
    repo: "Prodkazan-travelhub",
    presentation: "travelhub.pdf",
    winner: true
  }
];

const prodContainer = document.getElementById("prodProjects");
prodContainer.innerHTML = prodProjects.map((project, index) => `
  <article class="prod-entry${project.winner ? " winner" : ""}">
    <button class="achievement-row${project.winner ? " winner" : ""}" type="button"
      id="prod-trigger-${index}" aria-expanded="false" aria-controls="prod-panel-${index}">
      <span>${project.event}</span>
      <span class="prod-result">
        <span class="place">${project.winner ? '<svg class="icon" aria-hidden="true"><use href="#i-award"/></svg>' : ""}${project.place}</span>
        <svg class="icon prod-chevron" aria-hidden="true" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </span>
    </button>
    <div class="prod-panel" id="prod-panel-${index}" role="region" aria-labelledby="prod-trigger-${index}" inert>
      <div class="prod-panel-inner">
        <div class="prod-project">
          <div class="prod-project-heading">
            ${project.hoverLogo ? `
              <button class="prod-project-icon" type="button" aria-label="Make it rain Meimei">
                <img class="prod-project-default-image" src="images/logos/${project.logo}" alt="" width="36" height="36">
                <img class="prod-project-hover-image" src="${project.hoverLogo}" alt="" width="36" height="36">
              </button>
              <strong class="prod-project-name">
                <span class="prod-project-default-name">${project.name}</span>
                <span class="prod-project-hover-name" aria-hidden="true">${project.hoverName}</span>
              </strong>
            ` : `
              <img class="${project.logo === 'brandradar.png' ? 'brandradar-logo' : ''}" src="images/logos/${project.logo}" alt="" width="36" height="36">
              <strong>${project.name}</strong>
            `}
          </div>
          <p>${project.description}</p>
          <a class="project-link" href="https://github.com/thekeny/${project.repo}" target="_blank" rel="noopener noreferrer"
            aria-label="${project.name} on GitHub (new tab)">
            View on GitHub
            <svg class="icon" aria-hidden="true"><use href="#i-external"/></svg>
          </a>
          <a class="project-link" href="presentation/${project.presentation}" target="_blank" rel="noopener noreferrer"
            aria-label="${project.name} presentation (PDF, new tab)">
            Presentation
            <svg class="icon" aria-hidden="true"><use href="#i-external"/></svg>
          </a>
        </div>
      </div>
    </div>
  </article>
`).join("");

const prodEntries = [...prodContainer.querySelectorAll(".prod-entry")];
const achievementEntries = [...document.querySelectorAll(".prod-entry")];

function activateProdProject(selected) {
  achievementEntries.forEach(entry => {
    const expanded = entry === selected;
    entry.classList.toggle("active", expanded);
    entry.querySelector("button").setAttribute("aria-expanded", String(expanded));
    entry.querySelector(".prod-panel").inert = !expanded;
  });
}

achievementEntries.forEach(entry => {
  const trigger = entry.querySelector("button");
  entry.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") activateProdProject(entry);
  });
  trigger.addEventListener("click", () => {
    activateProdProject(entry.classList.contains("active") ? null : entry);
  });
  entry.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    trigger.focus({ preventScroll: true });
    activateProdProject(null);
    event.stopPropagation();
  });
});

