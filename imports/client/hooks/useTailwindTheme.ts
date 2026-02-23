import useEffectiveTheme from "./useEffectiveTheme";

const useTailwindTheme = () => {
  const theme = useEffectiveTheme();
  return theme === "light" ? "jollyroger" : "jollyroger-dark";
};

export default useTailwindTheme;
