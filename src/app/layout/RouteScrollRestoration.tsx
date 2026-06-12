import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

export function RouteScrollRestoration() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [navigationType, pathname]);

  return null;
}
