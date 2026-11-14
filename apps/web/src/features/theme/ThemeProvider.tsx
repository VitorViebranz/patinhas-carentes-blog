import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import {
    DARK_QUERY,
    THEME_STORAGE_KEY,
    parsePreference,
    readStoredPreference,
    resolveTheme,
    storePreference,
    systemPrefersDark,
    type ResolvedTheme,
    type ThemePreference,
} from './theme';

interface ThemeContextValue {
    preference: ThemePreference;
    resolved: ResolvedTheme;
    setPreference: (preference: ThemePreference) => void;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    preference: 'system',
    resolved: 'light',
    setPreference: () => undefined,
    toggle: () => undefined,
});

export function useTheme(): ThemeContextValue {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
    const [systemDark, setSystemDark] = useState(systemPrefersDark);
    const resolved = resolveTheme(preference, systemDark);

    useEffect(() => {
        if (typeof window.matchMedia !== 'function') return undefined;
        const query = window.matchMedia(DARK_QUERY);
        const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        document.documentElement.dataset['theme'] = resolved;
    }, [resolved]);

    useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key === THEME_STORAGE_KEY || event.key === null) {
                setPreferenceState(parsePreference(event.newValue));
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        storePreference(next);
    }, []);

    const toggle = useCallback(
        () => setPreference(resolved === 'dark' ? 'light' : 'dark'),
        [resolved, setPreference],
    );

    const value = useMemo(
        () => ({ preference, resolved, setPreference, toggle }),
        [preference, resolved, setPreference, toggle],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
