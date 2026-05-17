import styles from "@/app/dashboard/dashboard.module.css";

interface WidgetPlaceholderProps {
  variant: "list" | "metric" | "bars";
}

export function WidgetPlaceholder({ variant }: WidgetPlaceholderProps) {
  if (variant === "metric") {
    return (
      <div className={styles.placeholderMetric} aria-hidden>
        <div className={`${styles.placeholderBlock} ${styles.placeholderLarge}`} />
        <div className={`${styles.placeholderBlock} ${styles.placeholderSmall}`} />
      </div>
    );
  }

  if (variant === "bars") {
    return (
      <ul className={styles.placeholderBars} aria-hidden>
        {[100, 72, 58, 40, 28].map((width) => (
          <li key={width} className={styles.placeholderBarRow}>
            <div className={`${styles.placeholderBlock} ${styles.placeholderLabel}`} />
            <div
              className={styles.placeholderBarTrack}
              style={{ width: `${width}%` }}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={styles.placeholderList} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className={styles.placeholderListItem}>
          <div className={`${styles.placeholderBlock} ${styles.placeholderAvatar}`} />
          <div className={styles.placeholderLines}>
            <div className={`${styles.placeholderBlock} ${styles.placeholderLine}`} />
            <div
              className={`${styles.placeholderBlock} ${styles.placeholderLine} ${styles.placeholderLineShort}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
