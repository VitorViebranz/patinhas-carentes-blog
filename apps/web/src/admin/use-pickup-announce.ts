import { formatKg } from '../lib/format';
import { useDeletePickup } from '../services/api/admin';
import type { AdminPickup } from '../services/api/admin-types';
import { useToast } from './components/Toast';

export function usePickupAnnounce(): (pickup: AdminPickup) => void {
    const toast = useToast();
    const undo = useDeletePickup();

    return (pickup) =>
        toast(`Retirada registrada: ${formatKg(pickup.kg)} em ${pickup.pointName}.`, {
            label: 'Desfazer',
            onClick: () =>
                undo.mutate(pickup.id, {
                    onSuccess: () => toast('Retirada desfeita.'),
                    onError: () => toast('Não foi possível desfazer.'),
                }),
        });
}
