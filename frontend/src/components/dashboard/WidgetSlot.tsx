import styles from "@/app/dashboard/dashboard.module.css";

export interface WidgetSlotProps {
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function WidgetSlot({ title, description, children }: WidgetSlotProps) {
  const headingId = `widget-${title.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <section className={styles.widget} aria-labelledby={headingId}>
      <header className={styles.widgetHeader}>
        <h2 id={headingId} className={styles.widgetTitle}>
          {title}
        </h2>
        <p className={styles.widgetDescription}>{description}</p>
      </header>
      <div className={styles.widgetBody}>{children}</div>
    </section>
  );
}
