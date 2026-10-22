import { createContext, useContext } from "react";

export const DEFAULT_PRIMARY_COLOR = "#172554";

export const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  primaryColor: DEFAULT_PRIMARY_COLOR,
  setPrimaryColor: () => {},
});

export const useTheme = () => useContext(ThemeContext);
