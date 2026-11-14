import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY } from './theme';
import { ThemeProvider, useTheme } from './ThemeProvider';
import { ThemeSelector } from './ThemeSelector';
import { ThemeToggle } from './ThemeToggle';

type Listener = (event: MediaQueryListEvent) => void;

let systemDark = false;
let listeners: Listener[] = [];

function stubSystem(dark: boolean) {
    systemDark = dark;
    listeners = [];
    vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({
            get matches() {
                return systemDark;
            },
            addEventListener: (_: string, listener: Listener) => listeners.push(listener),
            removeEventListener: (_: string, listener: Listener) => {
                listeners = listeners.filter((item) => item !== listener);
            },
        })),
    );
}

function changeSystem(dark: boolean) {
    systemDark = dark;
    act(() => listeners.forEach((listener) => listener({ matches: dark } as MediaQueryListEvent)));
}

function Probe() {
    const { preference, resolved } = useTheme();
    return (
        <p>
            {preference}/{resolved}
        </p>
    );
}

function setup() {
    render(
        <ThemeProvider>
            <Probe />
            <ThemeToggle />
            <ThemeSelector />
        </ThemeProvider>,
    );
}

const applied = () => document.documentElement.dataset['theme'];

beforeEach(() => {
    window.localStorage.clear();
    delete document.documentElement.dataset['theme'];
    stubSystem(false);
});

afterEach(() => vi.unstubAllGlobals());

describe('ThemeProvider', () => {
    it('follows a light system by default', () => {
        setup();

        expect(screen.getByText('system/light')).toBeInTheDocument();
        expect(applied()).toBe('light');
    });

    it('follows a dark system by default', () => {
        stubSystem(true);
        setup();

        expect(screen.getByText('system/dark')).toBeInTheDocument();
        expect(applied()).toBe('dark');
    });

    it('uses the choice saved on a previous visit instead of the system', () => {
        window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        setup();

        expect(screen.getByText('dark/dark')).toBeInTheDocument();
        expect(applied()).toBe('dark');
    });

    it('ignores a saved value it does not know', () => {
        window.localStorage.setItem(THEME_STORAGE_KEY, 'roxo');
        setup();

        expect(screen.getByText('system/light')).toBeInTheDocument();
    });

    it('changes with the system while the person keeps the automatic option', () => {
        setup();

        changeSystem(true);

        expect(screen.getByText('system/dark')).toBeInTheDocument();
        expect(applied()).toBe('dark');
    });

    it('does not change with the system after an explicit choice', async () => {
        setup();
        await userEvent.click(screen.getByRole('button', { name: /Claro/ }));

        changeSystem(true);

        expect(screen.getByText('light/light')).toBeInTheDocument();
        expect(applied()).toBe('light');
    });

    it('survives a browser that blocks storage', async () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('blocked');
        });
        setup();

        await userEvent.click(screen.getByRole('button', { name: /Escuro/ }));

        expect(applied()).toBe('dark');
        vi.restoreAllMocks();
    });
});

describe('ThemeSelector', () => {
    it('marks the current option and saves a new one', async () => {
        setup();
        expect(screen.getByRole('button', { name: /Automático/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );

        await userEvent.click(screen.getByRole('button', { name: /Escuro/ }));

        expect(screen.getByRole('button', { name: /Escuro/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
        expect(applied()).toBe('dark');
    });

    it('goes back to automatic and forgets the saved choice', async () => {
        window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
        setup();

        await userEvent.click(screen.getByRole('button', { name: /Automático/ }));

        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
        expect(screen.getByText('system/light')).toBeInTheDocument();
    });
});

describe('ThemeToggle', () => {
    it('offers the opposite of what is showing and switches in one click', async () => {
        setup();

        await userEvent.click(screen.getByRole('button', { name: 'Mudar para o tema escuro' }));

        expect(applied()).toBe('dark');
        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
        expect(screen.getByRole('button', { name: 'Mudar para o tema claro' })).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Mudar para o tema claro' }));

        expect(applied()).toBe('light');
        expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });
});

describe('theme-init.js', () => {
    const script = readFileSync(resolve(process.cwd(), 'public/theme-init.js'), 'utf8');

    function run() {
        delete document.documentElement.dataset['theme'];
        new Function(script)();
        return applied();
    }

    it('applies the saved dark choice before the app loads', () => {
        window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');

        expect(run()).toBe('dark');
    });

    it('follows the system when nothing was saved', () => {
        stubSystem(true);

        expect(run()).toBe('dark');
    });

    it('keeps an explicit light choice even on a dark system', () => {
        stubSystem(true);
        window.localStorage.setItem(THEME_STORAGE_KEY, 'light');

        expect(run()).toBe('light');
    });
});
