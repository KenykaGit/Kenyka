"use strict";

const initialHash = decodeURIComponent(location.hash.slice(1));
const initialIndex = slides.findIndex(slide => slide.id === initialHash);

// Commit the hidden reveal state before activating the initial slide.
void track.offsetHeight;
goTo(Math.max(0, initialIndex), true);
