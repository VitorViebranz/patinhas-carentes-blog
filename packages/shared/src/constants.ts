export const GRAMS_PER_CAP = 2.5;
export const KG_PRICE_BRL = 2;
export const SPAY_COST_BRL = 350;

export const CAPS_PER_KG = 1000 / GRAMS_PER_CAP;

export const GOAL_KG = SPAY_COST_BRL / KG_PRICE_BRL;
export const GOAL_CAPS = GOAL_KG * CAPS_PER_KG;

export const METER_MAX_CAPS = 2000;
export const GROUP_EFFECT_PEOPLE = 100;
export const VACCINE_DOSE_COST_BRL = 60;
export const GOAL_KG_PER_DOSE = VACCINE_DOSE_COST_BRL / KG_PRICE_BRL;
