import styles from "@/app/dashboard/dashboard.module.css";

interface WidgetStateProps {
  message: string;
  onRetry?: () => void;
  variant?: "error" | "empty";
}

export function WidgetState({
  message,
  onRetry,
  variant = "error",
}: WidgetStateProps) {
  return (
    <div className={variant === "empty" ? styles.widgetEmpty : styles.widgetError}>
      <p role={variant === "error" ? "alert" : "status"}>{message}</p>
      {onRetry ? (
        <button type="button" className={styles.widgetRetry} onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
