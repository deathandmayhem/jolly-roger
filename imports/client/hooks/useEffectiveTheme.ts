import { useMediaQuery } from "usehooks-ts";
import { useAppThemeState } from "./persisted-state";

const useEffectiveTheme = () => {
  const [appTheme] = useAppThemeState();
  const systemPrefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const effectiveTheme =
    appTheme === "auto" ? (systemPrefersDark ? "dark" : "light") : appTheme;
  return effectiveTheme;
};

export default useEffectiveTheme;
