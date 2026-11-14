export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'patinhas-theme';
export const DARK_QUERY = '(prefers-color-scheme: dark)';

export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
    { value: 'system', label: 'Automático' },
    { value: 'light', label: 'Claro' },
    { value: 'dark', label: 'Escuro' },
];

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

export function parsePreference(raw: string | null | undefined): ThemePreference {
    return raw === 'light' || raw === 'dark' ? raw : 'system';
}

export function resolveTheme(
    preference: ThemePreference,
    systemPrefersDark: boolean,
): ResolvedTheme {
    if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
    return preference;
}

export function readStoredPreference(storage?: ReadableStorage): ThemePreference {
    try {
        return parsePreference((storage ?? window.localStorage).getItem(THEME_STORAGE_KEY));
    } catch {
        return 'system';
    }
}

export function storePreference(preference: ThemePreference, storage?: WritableStorage): void {
    try {
        const target = storage ?? window.localStorage;
        if (preference === 'system') target.removeItem(THEME_STORAGE_KEY);
        else target.setItem(THEME_STORAGE_KEY, preference);
    } catch {
        return;
    }
}

export function systemPrefersDark(): boolean {
    return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches;
}
