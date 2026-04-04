import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WorkSpace } from "../pages/Workspace";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WorkSpace />
  </StrictMode>,
);
