import { useTheme } from "next-themes";

export const useCurrentTheme = () => {
  const { theme, systemTheme } = useTheme();

  if (["dark", "light"].includes(theme || "")) {
    return theme;
  }
  return systemTheme;
};
