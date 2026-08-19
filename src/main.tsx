import { createRoot } from "react-dom/client";
import Home from "./v11-page";
import { Site } from "./site/site";

// Which page is this? build.mjs stamps window.__ROUTE__ per route folder. The interactive prototype lives at /demo/;
// the root with the old demo query params (?mode= ?c= ?guide= ?passport=) still opens the prototype so every link keeps working.
const route: string = (window as any).__ROUTE__ ?? "";
const q = new URLSearchParams(location.search);
const demoParams = ["mode", "c", "guide", "passport", "cpage", "lpage"].some((k) => q.has(k));
const isDemo = route === "demo" || (route === "" && demoParams);
createRoot(document.getElementById("root")!).render(isDemo ? <Home /> : <Site route={route} />);
