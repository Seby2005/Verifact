import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>AI Fact-Checker</h1>
      <p className={styles.description}>
        Verifică știrile și conținutul de pe rețelele sociale cu inteligență
        artificială.
      </p>
    </main>
  );
}
