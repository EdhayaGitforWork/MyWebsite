type InputFieldProps = {
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

export default function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  disabled = false,
}: InputFieldProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      <label style={{ fontSize: "14px", fontWeight: 600, color: "#374151" }}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          padding: "11px 14px",
          fontSize: "15px",
          borderRadius: "8px",
          border: `1.5px solid ${error ? "#ef4444" : "#d1d5db"}`,
          outline: "none",
          width: "100%",
          boxSizing: "border-box" as const,
          backgroundColor: disabled ? "#f9fafb" : "white",
          color: "#111827",
          transition: "border-color 0.2s",
        }}
      />

      {/* ✅ Inline field-level error */}
      {error && (
        <span style={{ fontSize: "13px", color: "#ef4444" }}>{error}</span>
      )}
    </div>
  );
}