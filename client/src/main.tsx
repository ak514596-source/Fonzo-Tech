import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { isPortalHost } from "./lib/portal";

if (!window.location.hash) {
  window.location.hash = "#/";
}

// On the team portal subdomain, keep it out of search engines and give it its
// own page title. (The customer storefront keeps the title set in index.html.)
if (isPortalHost()) {
  document.title = "Fonzo Tech — Team Portal";
  const robots = document.createElement("meta");
  robots.name = "robots";
  robots.content = "noindex, nofollow";
  document.head.appendChild(robots);
}

createRoot(document.getElementById("root")!).render(<App />);
