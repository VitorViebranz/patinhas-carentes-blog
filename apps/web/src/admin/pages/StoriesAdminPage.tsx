import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { Icon } from '../../components/icon/Icon';
import { StateMessage } from '../../components/state-message/StateMessage';
import { formatShortDate } from '../../lib/format';
import { useDocumentTitle } from '../../lib/use-document-title';
import {
    useAdminStories,
    useDeleteStory,
    usePublishStory,
    useSaveStory,
    useUploadMedia,
} from '../../services/api/admin';
import type { AdminStory } from '../../services/api/admin-types';
import styles from '../admin.module.css';
import { AdminInput, AdminTextarea } from '../components/AdminField';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { FeatureNotice } from '../components/FeatureNotice';
import { IconButton } from '../components/IconButton';
import { useToast } from '../components/Toast';
import {
    STORY_FILTERS,
    countStories,
    describeReading,
    filterStories,
    type StoryFilter,
} from '../story-list';

const MAX_PHOTO_MB = 5;

function usePhotoPreview(photo: File | null): string | null {
    const url = useMemo(
        () =>
            photo && typeof URL.createObjectURL === 'function' ? URL.createObjectURL(photo) : null,
        [photo],
    );
    useEffect(
        () => () => {
            if (url) URL.revokeObjectURL(url);
        },
        [url],
    );
    return url;
}

export function StoriesAdminPage() {
    useDocumentTitle('Histórias | Painel Patinhas');
    const toast = useToast();
    const stories = useAdminStories();
    const save = useSaveStory();
    const publish = usePublishStory();
    const remove = useDeleteStory();
    const [removing, setRemoving] = useState<AdminStory | null>(null);
    const upload = useUploadMedia();

    const [filter, setFilter] = useState<StoryFilter>('all');
    const [editing, setEditing] = useState<AdminStory | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [alt, setAlt] = useState('');
    const [errors, setErrors] = useState<
        Partial<Record<'title' | 'body' | 'photo' | 'alt', string | undefined>>
    >({});
    const preview = usePhotoPreview(photo);

    function reset() {
        setEditing(null);
        setTitle('');
        setBody('');
        setPhoto(null);
        setAlt('');
        setErrors({});
    }

    function edit(story: AdminStory) {
        setEditing(story);
        setTitle(story.title);
        setBody(story.body);
        setPhoto(null);
        setAlt(story.coverAlt ?? '');
        setErrors({});
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;
        if (file && file.size > MAX_PHOTO_MB * 1024 * 1024) {
            setErrors((current) => ({
                ...current,
                photo: `A foto deve ter até ${MAX_PHOTO_MB} MB.`,
            }));
            event.target.value = '';
            return;
        }
        setErrors((current) => ({ ...current, photo: undefined }));
        setPhoto(file);
    }

    async function persist(thenPublish: boolean) {
        const found: typeof errors = {};
        if (!title.trim()) found.title = 'Escreva o título.';
        if (!body.trim()) found.body = 'Escreva o texto.';
        if (photo && !alt.trim())
            found.alt = 'Descreva a foto em uma frase, para quem não enxerga.';
        setErrors(found);
        if (Object.keys(found).length > 0) return;

        try {
            const coverMediaId = photo
                ? (await upload.mutateAsync({ file: photo, altText: alt.trim() })).id
                : undefined;
            const saved = await save.mutateAsync({
                ...(editing ? { id: editing.id } : {}),
                title: title.trim(),
                body: body.trim(),
                ...(coverMediaId ? { coverMediaId } : {}),
            });
            if (thenPublish) await publish.mutateAsync({ id: saved.id, publish: true });
            toast(thenPublish ? 'História publicada no site.' : 'Rascunho salvo.');
            reset();
        } catch {
            toast('Não foi possível salvar. Confira a foto e tente de novo.');
        }
    }

    function submit(event: FormEvent) {
        event.preventDefault();
        void persist(true);
    }

    const busy = save.isPending || publish.isPending || upload.isPending;
    const all = stories.data ?? [];
    const visible = filterStories(all, filter);
    const currentCover = preview ?? (editing?.coverUrl && !photo ? editing.coverUrl : null);
    const reading = describeReading(body);

    return (
        <>
            <FeatureNotice feature="page.stories" />
            <div className={styles['cols']}>
                <form className={styles['card']} onSubmit={submit} noValidate>
                    <div className={styles['cardHead']}>
                        <h2>{editing ? 'Editar história' : 'Nova história'}</h2>
                        {editing ? (
                            <button className={styles['link']} type="button" onClick={reset}>
                                Cancelar edição
                            </button>
                        ) : null}
                    </div>
                    {editing ? (
                        <p className={styles['muted']}>
                            <span
                                className={`${styles['chip']} ${editing.status === 'PUBLISHED' ? styles['chipDone'] : styles['chipGray']}`}
                            >
                                {editing.status === 'PUBLISHED' ? 'Publicada' : 'Rascunho'}
                            </span>{' '}
                            Ao publicar de novo, a história aparece no site com o texto novo.
                        </p>
                    ) : null}
                    <div className={`${styles['fgrid']} ${styles['one']}`}>
                        <AdminInput
                            label="Título"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex.: Ninhada resgatada essa semana"
                            error={errors.title}
                        />
                        <AdminTextarea
                            label="Texto"
                            rows={7}
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Conte o que aconteceu. Deixe uma linha em branco entre parágrafos."
                            error={errors.body}
                            hint={reading || undefined}
                        />
                        <AdminInput
                            label="Foto (opcional)"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={pickPhoto}
                            error={errors.photo}
                            hint={
                                editing?.coverUrl && !photo
                                    ? 'Já tem uma foto. Envie outra só se quiser trocar.'
                                    : `JPG, PNG ou WebP, até ${MAX_PHOTO_MB} MB.`
                            }
                        />
                        {currentCover ? (
                            <div className={styles['photoPreview']}>
                                <img src={currentCover} alt="" />
                                <span className={styles['muted']}>
                                    {photo ? 'Foto que vai para o site' : 'Foto atual'}
                                </span>
                            </div>
                        ) : null}
                        {photo ? (
                            <AdminInput
                                label="Descrição da foto"
                                value={alt}
                                onChange={(e) => setAlt(e.target.value)}
                                placeholder="Ex.: Cinco filhotes dormindo em uma caixa"
                                error={errors.alt}
                            />
                        ) : null}
                    </div>
                    <div className={styles['actions']}>
                        <button className={styles['btn']} type="submit" disabled={busy}>
                            {busy ? 'Salvando...' : 'Publicar no site'}
                        </button>
                        <button
                            className={`${styles['btn']} ${styles['ghost']}`}
                            type="button"
                            disabled={busy}
                            onClick={() => void persist(false)}
                        >
                            Salvar rascunho
                        </button>
                    </div>
                </form>

                <div className={styles['card']}>
                    <div className={styles['cardHead']}>
                        <h2>Histórias</h2>
                    </div>
                    <div className={styles['tabs']} role="group" aria-label="Filtrar histórias">
                        {STORY_FILTERS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                aria-pressed={filter === value}
                                onClick={() => setFilter(value)}
                            >
                                {label} ({countStories(all, value)})
                            </button>
                        ))}
                    </div>
                    {stories.isPending ? (
                        <StateMessage kind="loading">Carregando...</StateMessage>
                    ) : null}
                    {stories.isError ? (
                        <StateMessage kind="error" onRetry={() => void stories.refetch()}>
                            Não foi possível carregar as histórias.
                        </StateMessage>
                    ) : null}
                    {stories.data && all.length === 0 ? (
                        <EmptyState
                            icon="book"
                            title="Nenhuma história ainda"
                            hint="Conte um resgate ou uma adoção. Histórias reais aproximam quem pode ajudar."
                        />
                    ) : null}
                    {stories.data && all.length > 0 && visible.length === 0 ? (
                        <p className={styles['muted']}>Nenhuma história neste filtro.</p>
                    ) : null}
                    {visible.length > 0 ? (
                        <ul className={styles['storyList']}>
                            {visible.map((story) => (
                                <li key={story.id} className={styles['storyRow']}>
                                    <div className={styles['thumb']}>
                                        {story.coverUrl ? (
                                            <img src={story.coverUrl} alt="" />
                                        ) : (
                                            <Icon name="file" />
                                        )}
                                    </div>
                                    <div>
                                        <b>{story.title}</b>
                                        <div className={styles['storyMeta']}>
                                            <span
                                                className={`${styles['chip']} ${story.status === 'PUBLISHED' ? styles['chipDone'] : styles['chipGray']}`}
                                            >
                                                {story.status === 'PUBLISHED'
                                                    ? 'Publicada'
                                                    : 'Rascunho'}
                                            </span>
                                            {story.status === 'PUBLISHED' && story.publishedAt ? (
                                                <span>{formatShortDate(story.publishedAt)}</span>
                                            ) : null}
                                            {story.status === 'PUBLISHED' ? (
                                                <a
                                                    href={`/historias/${story.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    Ver no site
                                                </a>
                                            ) : null}
                                        </div>
                                        {story.excerpt ? (
                                            <p className={styles['storyExcerpt']}>
                                                {story.excerpt}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className={styles['iconRow']}>
                                        <IconButton
                                            icon="pencil"
                                            label="Editar história"
                                            onClick={() => edit(story)}
                                        />
                                        <IconButton
                                            icon={story.status === 'PUBLISHED' ? 'eyeOff' : 'eye'}
                                            label={
                                                story.status === 'PUBLISHED'
                                                    ? 'Tirar do site'
                                                    : 'Publicar no site'
                                            }
                                            disabled={publish.isPending}
                                            onClick={() =>
                                                publish.mutate(
                                                    {
                                                        id: story.id,
                                                        publish: story.status !== 'PUBLISHED',
                                                    },
                                                    {
                                                        onSuccess: () =>
                                                            toast(
                                                                story.status === 'PUBLISHED'
                                                                    ? 'Tirada do site.'
                                                                    : 'Publicada no site.',
                                                                {
                                                                    label: 'Desfazer',
                                                                    onClick: () =>
                                                                        publish.mutate({
                                                                            id: story.id,
                                                                            publish:
                                                                                story.status ===
                                                                                'PUBLISHED',
                                                                        }),
                                                                },
                                                            ),
                                                        onError: () =>
                                                            toast('Não foi possível alterar.'),
                                                    },
                                                )
                                            }
                                        />
                                        <IconButton
                                            icon="trash"
                                            label="Apagar história"
                                            tone="danger"
                                            onClick={() => setRemoving(story)}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
                {removing ? (
                    <ConfirmDialog
                        title="Apagar esta história?"
                        message={`"${removing.title}" será apagada do painel e do site. Isso não pode ser desfeito.`}
                        confirmLabel="Apagar história"
                        pending={remove.isPending}
                        onCancel={() => setRemoving(null)}
                        onConfirm={() => {
                            remove.mutate(removing.id, {
                                onSuccess: () => toast('História apagada.'),
                                onError: () => toast('Não foi possível apagar.'),
                            });
                            setRemoving(null);
                        }}
                    />
                ) : null}
            </div>
        </>
    );
}
