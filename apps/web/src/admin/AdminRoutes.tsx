import { Route, Routes } from 'react-router-dom';
import { NotFoundPage } from '../pages/placeholder/PlaceholderPage';
import { AdminGuard } from './AdminGuard';
import { AdminLayout } from './AdminLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PickupsPage } from './pages/PickupsPage';
import { PointsPage } from './pages/PointsPage';
import { ReportsPage } from './pages/ReportsPage';
import { RequestsPage } from './pages/RequestsPage';
import { StoriesAdminPage } from './pages/StoriesAdminPage';
import { TeamPage } from './pages/TeamPage';
import { VisibilityPage } from './pages/VisibilityPage';

export default function AdminRoutes() {
    return (
        <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route element={<AdminGuard />}>
                <Route element={<AdminLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="pontos" element={<PointsPage />} />
                    <Route path="retiradas" element={<PickupsPage />} />
                    <Route path="solicitacoes" element={<RequestsPage />} />
                    <Route path="contas" element={<ReportsPage />} />
                    <Route path="historias" element={<StoriesAdminPage />} />
                    <Route path="visibilidade" element={<VisibilityPage />} />
                    <Route path="equipe" element={<TeamPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Route>
        </Routes>
    );
}
