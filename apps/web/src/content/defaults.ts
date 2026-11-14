import { GRAMS_PER_CAP, KG_PRICE_BRL, SPAY_COST_BRL, VACCINE_DOSE_COST_BRL, type ImpactSettings } from '@patinhas/shared';

export const DEFAULT_IMPACT_SETTINGS: ImpactSettings = {
    gramsPerCap: GRAMS_PER_CAP,
    kgPriceBrl: KG_PRICE_BRL,
    spayCostBrl: SPAY_COST_BRL,
    vaccineDoseCostBrl: VACCINE_DOSE_COST_BRL,
};
