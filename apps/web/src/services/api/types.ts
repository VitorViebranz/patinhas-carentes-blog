export type PointCategory =
    'PET_VET' | 'EDUCATION' | 'HEALTH' | 'GROCERY_FOOD' | 'COMMERCE_SERVICES';

export type LocationPrecision = 'HOUSE_NUMBER' | 'STREET' | 'PLACE_NAME' | 'NEIGHBORHOOD';

export interface CollectionPoint {
    id: string;
    name: string;
    neighborhoodId: string;
    neighborhood: string;
    address: string | null;
    phone: string | null;
    category: PointCategory;
    openingHours: string | null;
    latitude: number;
    longitude: number;
    locationPrecision: LocationPrecision;
    outsideMainArea: boolean;
}

export interface Neighborhood {
    id: string;
    name: string;
    slug: string;
    latitude: number;
    longitude: number;
    outsideMainArea: boolean;
    pointCount: number;
}

export interface SiteSettings {
    gramsPerCap: number;
    kgPriceBrl: number;
    spayCostBrl: number;
    vaccineDoseCostBrl: number;
    kgPer100LBag: number;
    doseGoalKg: number;
    goalKg: number;
    monthlyAverageKg: number;
    animalsServedYear: number | null;
    cnpj: string | null;
    pixKey: string | null;
    whatsappNumber: string | null;
    instagramHandle: string | null;
    adoptionUrl: string | null;
    hiddenFeatures: string[];
    collectionPointCount: number;
    neighborhoodCount: number;
}

export interface MonthlyReport {
    month: string;
    totalKg: number;
    capCount: number;
    castrations: number;
    remainingKg: number;
    doses: number;
    remainingKgToNextDose: number;
    animalsVaccinated: number | null;
    dosesApplied: number | null;
    doseCostBrl: number | null;
    medicationSpentBrl: number | null;
    feedSpentBrl: number | null;
    castrationsDone: number | null;
    otherIncomeBrl: number | null;
    outcomeSummary: string | null;
    publishedAt: string | null;
}

export interface StorySummary {
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    coverUrl: string | null;
    coverAlt: string | null;
    publishedAt: string | null;
}

export interface StoryDetail extends StorySummary {
    body: string;
}

export type LeaderboardPeriod = 'month' | 'year' | 'all';

export interface LeaderboardEntry {
    rank: number;
    pointId: string;
    name: string;
    neighborhood: string;
    category: PointCategory;
    totalKg: number;
    pickups: number;
    lastPickupOn: string | null;
}

export interface ImpactFigures {
    capCount: number;
    castrations: number;
    remainingKg: number;
    doses: number;
}

export interface Leaderboard extends ImpactFigures {
    period: LeaderboardPeriod;
    since: string | null;
    totalKg: number;
    pickups: number;
    pointCount: number;
    items: LeaderboardEntry[];
}

export interface PointImpact extends ImpactFigures {
    point: { id: string; name: string; neighborhood: string; category: PointCategory };
    totalKg: number;
    pickups: number;
    firstPickupOn: string | null;
    lastPickupOn: string | null;
}

export interface PostalAddress {
    postalCode: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
}

export interface HelpRequestInput {
    type: 'COLLECTION_POINT' | 'FOSTER' | 'TALK';
    requesterName: string;
    contact: string;
    institutionName?: string;
    institutionType?: 'SCHOOL' | 'COMPANY' | 'STORE' | 'CONDO';
    wantsTalk?: boolean;
    animalCapacity?: number;
    message?: string;
    postalCode?: string;
    address?: string;
    neighborhoodName?: string;
    consent: true;
    website?: string;
}
