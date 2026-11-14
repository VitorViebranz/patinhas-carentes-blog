export function compact<T extends Record<string, unknown>>(
    value: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as {
        [K in keyof T]?: Exclude<T[K], undefined>;
    };
}
