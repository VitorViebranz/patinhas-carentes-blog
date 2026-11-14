import type { CollectionPoint, MonthlyReport, PointCategory, StoryDetail } from './types';

export type Role = 'ADMIN' | 'EDITOR';

export interface SessionUser {
    id: string;
    name: string;
    email: string;
    role: Role;
}

export interface Meta {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface Paged<T> {
    items: T[];
    meta: Meta;
}

export interface Dashboard {
    activePoints: number;
    newHelpRequests: number;
    pointsWithoutPhone: number;
    approximateLocationPoints: number;
    pendingReport: { month: string; status: 'MISSING' | 'DRAFT' | 'PUBLISHED' };
}

export interface AdminPoint extends CollectionPoint {
    status: 'ACTIVE' | 'INACTIVE';
    locationSource?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AdminPickup {
    id: string;
    pointId: string;
    pointName: string;
    pickedUpOn: string;
    kg: number;
    bags: number | null;
    bagLiters: number | null;
    createdAt: string;
}

export type ReportFinanceKey =
    | 'animalsVaccinated'
    | 'dosesApplied'
    | 'doseCostBrl'
    | 'medicationSpentBrl'
    | 'feedSpentBrl'
    | 'castrationsDone'
    | 'otherIncomeBrl';

export type ReportFinance = Partial<Record<ReportFinanceKey, number | null>>;

export interface PickupSummary {
    pointId: string;
    totalKg: number;
    pickups: number;
    lastPickupOn: string | null;
}

export interface PickupInput {
    pointId: string;
    kg?: number;
    bags?: number;
    bagLiters?: number;
    pickedUpOn?: string;
}

export interface PointFilters {
    q?: string;
    neighborhoodId?: string;
    missingPhone?: boolean;
    approximateLocation?: boolean;
    page: number;
}

export interface PointInput {
    name: string;
    neighborhoodId: string;
    address?: string;
    phone?: string;
    category: PointCategory;
    openingHours?: string;
    latitude?: number;
    longitude?: number;
    locationPrecision?: 'HOUSE_NUMBER' | 'STREET' | 'PLACE_NAME';
}

export interface AdminHelpRequest {
    id: string;
    type: 'COLLECTION_POINT' | 'FOSTER' | 'TALK';
    requesterName: string;
    contact: string;
    institutionName: string | null;
    institutionType: 'SCHOOL' | 'COMPANY' | 'STORE' | 'CONDO' | null;
    wantsTalk: boolean;
    animalCapacity: number | null;
    message: string | null;
    postalCode: string | null;
    address: string | null;
    neighborhoodName: string | null;
    status: 'NEW' | 'ANSWERED';
    consentGivenAt: string;
    answeredAt: string | null;
    createdAt: string;
}

export interface AdminReport extends MonthlyReport {
    id: string;
    status: 'DRAFT' | 'PUBLISHED';
    createdAt: string;
}

export interface AdminStory extends StoryDetail {
    status: 'DRAFT' | 'PUBLISHED';
    coverMediaId: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface AdminMedia {
    id: string;
    url: string;
    mimeType: string;
    sizeBytes: number;
    altText: string;
    createdAt: string;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
}

export interface AdminSettings {
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
    updatedAt: string;
}

export type SettingsInput = Partial<Omit<AdminSettings, 'updatedAt' | 'goalKg' | 'doseGoalKg' | 'hiddenFeatures'>>;

export interface GeocodePreview {
    found: boolean;
    latitude: number;
    longitude: number;
    locationPrecision: 'HOUSE_NUMBER' | 'STREET' | 'PLACE_NAME' | 'NEIGHBORHOOD';
}
