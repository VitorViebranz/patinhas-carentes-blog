import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { StateMessage } from '../components/state-message/StateMessage';
import { useSession } from '../services/api/admin';

export function AdminGuard() {
    const session = useSession();
    const location = useLocation();

    if (session.isPending)
        return <StateMessage kind="loading">Verificando o acesso...</StateMessage>;
    if (session.isError) {
        return (
            <StateMessage kind="error" onRetry={() => void session.refetch()}>
                Não foi possível verificar o acesso.
            </StateMessage>
        );
    }
    if (!session.data)
        return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
    return <Outlet />;
}
