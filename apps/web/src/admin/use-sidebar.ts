import { useCallback, useState } from 'react';

export const SIDEBAR_STORAGE_KEY = 'patinhas-admin-sidebar';
const COLLAPSED_VALUE = 'collapsed';

function readCollapsed(): boolean {
    try {
        return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === COLLAPSED_VALUE;
    } catch {
        return false;
    }
}

function writeCollapsed(collapsed: boolean): void {
    try {
        if (collapsed) window.localStorage.setItem(SIDEBAR_STORAGE_KEY, COLLAPSED_VALUE);
        else window.localStorage.removeItem(SIDEBAR_STORAGE_KEY);
    } catch {
        return;
    }
}

export function useSidebarCollapsed(): [boolean, () => void] {
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const toggle = useCallback(() => {
        setCollapsed((current) => {
            writeCollapsed(!current);
            return !current;
        });
    }, []);
    return [collapsed, toggle];
}
