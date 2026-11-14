import { describe, expect, it } from 'vitest';
import { CAPS_PER_KG, GOAL_CAPS, GOAL_KG } from './constants';

describe('constants', () => {
    it('derives 400 caps per kg from the default cap weight', () => {
        expect(CAPS_PER_KG).toBe(400);
    });

    it('derives 175 kg per neutering from R$ 350 and R$ 2 per kg', () => {
        expect(GOAL_KG).toBe(175);
    });

    it('derives 70,000 caps from the default goal', () => {
        expect(GOAL_CAPS).toBe(70_000);
    });
});
