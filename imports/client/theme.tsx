import type { ThemeConfig } from "react-select";

export interface Theme {
  reactSelectTheme: ThemeConfig;
}

export const defaultTheme: Theme = {
  reactSelectTheme: {
    borderRadius: 4,
    colors: {
      primary: "#2684ff",
      primary75: "#4c9aff",
      primary50: "#b2d4ff",
      primary25: "#deebff",
      danger: "#de350b",
      dangerLight: "ffbdad",
      neutral0: "hsl(0, 0%, 100%)",
      neutral5: "hsl(0, 0%, 95%)",
      neutral10: "hsl(0, 0%, 90%)",
      neutral20: "hsl(0, 0%, 80%)",
      neutral30: "hsl(0, 0%, 70%)",
      neutral40: "hsl(0, 0%, 60%)",
      neutral50: "hsl(0, 0%, 50%)",
      neutral60: "hsl(0, 0%, 40%)",
      neutral70: "hsl(0, 0%, 30%)",
      neutral80: "hsl(0, 0%, 20%)",
      neutral90: "hsl(0, 0%, 10%)",
    },
    spacing: {
      baseUnit: 4,
      controlHeight: 38,
      menuGutter: 8,
    },
  },
};
