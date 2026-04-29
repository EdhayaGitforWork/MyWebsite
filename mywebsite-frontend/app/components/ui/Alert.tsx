type AlertType = "success" | "error" | "info";

type AlertProps = {
  type: AlertType;
  message: string;
};

const styles: Record<AlertType, React.CSSProperties> = {
  success: { backgroundColor: "#f0fdf4", border: "1.5px solid #86efac", color: "#166534" },
  error:   { backgroundColor: "#fef2f2", border: "1.5px solid #fca5a5", color: "#991b1b" },
  info:    { backgroundColor: "#eff6ff", border: "1.5px solid #93c5fd", color: "#1e40af" },
};

const icons: Record<AlertType, string> = {
  success: "✅",
  error:   "❌",
  info:    "ℹ️",
};

export default function Alert({ type, message }: AlertProps) {
  return (
    <div
      style={{
        ...styles[type],
        padding: "12px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 500,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        width: "100%",
        boxSizing: "border-box" as const,
      }}
    >
      <span>{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}