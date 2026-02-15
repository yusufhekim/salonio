import React, { createContext, useContext, ReactNode } from 'react';

interface Theme {
  colors: {
    primary: string;
    background: string;
    text: string;
  };
}

const defaultTheme: Theme = {
  colors: {
    primary: '#2563EB',
    background: '#FFFFFF',
    text: '#111827',
  },
};

const ThemeContext = createContext<Theme>(defaultTheme);

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={defaultTheme}>
      {children}
    </ThemeContext.Provider>
  );
}
