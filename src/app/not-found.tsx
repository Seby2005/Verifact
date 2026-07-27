import { Button } from '@/components/ui';
import styles from './not-found.module.css';

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Pagina nu a fost găsită</h1>
      <p className={styles.lead}>
        Pagina pe care o cauți nu există sau a fost mutată.
      </p>
      <Button href="/" variant="primary" size="lg">
        Înapoi la prima pagină
      </Button>
    </div>
  );
}
