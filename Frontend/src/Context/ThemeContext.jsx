import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/*
	ThemeContext
	--------------------------------------------------
	Provides light / dark theme toggling. Defaults to dark (existing design tokens).
	Persists preference in localStorage and respects system preference on first load.
*/

const THEME_STORAGE_KEY = 'mk-theme';

const ThemeContext = createContext({
	theme: 'dark',
	toggleTheme: () => {},
	setTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
	const getInitial = () => {
		const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null;
		if (stored === 'light' || stored === 'dark') return stored;
		if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches) {
			return 'light';
		}
		return 'dark';
	};

	const [theme, setTheme] = useState(getInitial);

	useEffect(() => {
		if (typeof document !== 'undefined') {
			const root = document.documentElement;
			root.classList.remove('theme-light', 'theme-dark');
			root.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
		}
		try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {}
	}, [theme]);

	const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

	const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme]);

	return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
