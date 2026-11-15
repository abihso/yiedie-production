import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { InputHTMLAttributes } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({
  className = "",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block w-full">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`w-full ${className} pr-12`}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-[#1900FF] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1900FF]"
      >
        {visible ? (
          <EyeOff aria-hidden="true" size={20} />
        ) : (
          <Eye aria-hidden="true" size={20} />
        )}
      </button>
    </span>
  );
}
