import type { FeatureKey } from '@patinhas/shared';
import { lazy, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { StateMessage } from '../components/state-message/StateMessage';
import { PageGate } from '../features/site-features/PageGate';
import { HomePage } from '../pages/home/HomePage';
import { NotFoundPage } from '../pages/placeholder/PlaceholderPage';
import { CertificatePage } from '../pages/certificate/CertificatePage';
import { DenouncePage } from '../pages/denounce/DenouncePage';
import { HelpPage } from '../pages/help/HelpPage';
import { LeaderboardPage } from '../pages/leaderboard/LeaderboardPage';
import { PrivacyPage } from '../pages/privacy/PrivacyPage';
import { ReportPage } from '../pages/report/ReportPage';
import { SchoolPage } from '../pages/school/SchoolPage';
import { StoriesPage } from '../pages/stories/StoriesPage';
import { StoryPage } from '../pages/stories/StoryPage';
import { PublicLayout } from './layouts/PublicLayout';
import { ScrollManager } from './ScrollManager';

const AdminRoutes = lazy(() => import('../admin/AdminRoutes'));

const gated = (feature: FeatureKey, page: ReactNode) => (
    <PageGate feature={feature}>{page}</PageGate>
);

export function AppRoutes() {
    return (
        <>
            <ScrollManager />
            <Routes>
                <Route element={<PublicLayout />}>
                    <Route index element={<HomePage />} />
                    <Route
                        path="escolas-e-empresas"
                        element={gated('page.school', <SchoolPage />)}
                    />
                    <Route path="como-ajudar" element={gated('page.help', <HelpPage />)} />
                    <Route
                        path="prestacao-de-contas"
                        element={gated('page.report', <ReportPage />)}
                    />
                    <Route path="placar" element={gated('page.leaderboard', <LeaderboardPage />)} />
                    <Route
                        path="certificado/:id"
                        element={gated('page.leaderboard', <CertificatePage />)}
                    />
                    <Route path="denuncia" element={gated('page.denounce', <DenouncePage />)} />
                    <Route path="historias" element={gated('page.stories', <StoriesPage />)} />
                    <Route path="historias/:slug" element={gated('page.stories', <StoryPage />)} />
                    <Route path="privacidade" element={<PrivacyPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route
                    path="admin/*"
                    element={
                        <Suspense
                            fallback={<StateMessage kind="loading">Carregando...</StateMessage>}
                        >
                            <AdminRoutes />
                        </Suspense>
                    }
                />
            </Routes>
        </>
    );
}
