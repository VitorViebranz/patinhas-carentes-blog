import { Icon } from '../../components/icon/Icon';
import type { IconName } from '../../components/icon/icon-data';
import { SiteImage } from '../../components/site-image/SiteImage';
import { QrCode } from './QrCode';
import { POSTER_ACCEPTED, POSTER_REFUSED, posterName, posterNameSize } from './poster-text';
import styles from './poster.module.css';

interface PosterProps {
    name: string;
    instagram: string;
    url: string;
}

interface RuleCardProps {
    tone: 'yes' | 'no';
    icon: IconName;
    title: string;
    items: readonly string[];
}

function RuleCard({ tone, icon, title, items }: RuleCardProps) {
    return (
        <div className={`${styles['card']} ${styles[tone]}`}>
            <div className={styles['cardHead']}>
                <Icon name={icon} />
                {title}
            </div>
            <ul className={styles['list']}>
                {items.map((item) => (
                    <li key={item}>{item}</li>
                ))}
            </ul>
        </div>
    );
}

export function Poster({ name, instagram, url }: PosterProps) {
    const placeName = posterName(name);
    return (
        <div className={`${styles['poster']} theme-light`} id="poster">
            <div className={styles['top']}>
                <SiteImage file="logo-real.jpg" alt="" width={40} height={40} />
                <span className={styles['brand']}>Patinhas Carentes Joinville</span>
                <span className={styles['badge']}>Ponto de coleta</span>
            </div>
            <div className={styles['hero']}>
                <p className={styles['lead']}>Aqui você deixa suas</p>
                <p className={styles['title']}>
                    <span className={styles['mark']}>tampinhas</span>
                    <span className={styles['sub']}>plásticas</span>
                </p>
            </div>
            <div className={styles['place']} data-size={posterNameSize(placeName)}>
                <div className={styles['name']}>{placeName}</div>
            </div>
            <div className={styles['mid']}>
                <div className={styles['qr']}>
                    <QrCode value={url} label="QR code para a página de doação de tampinhas" />
                </div>
                <div className={styles['scan']}>
                    <span className={styles['scanLabel']}>Escaneie</span>
                    <p>
                        Aponte a câmera do celular e veja como a sua tampinha ajuda os animais de
                        Joinville.
                    </p>
                </div>
            </div>
            <div className={styles['rules']}>
                <RuleCard tone="yes" icon="check" title="Pode" items={POSTER_ACCEPTED} />
                <RuleCard tone="no" icon="x" title="Não pode" items={POSTER_REFUSED} />
            </div>
            <div className={styles['foot']}>
                <span>Siga no Instagram</span>
                <b>@{instagram}</b>
            </div>
        </div>
    );
}
