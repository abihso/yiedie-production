import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function DashboardDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      aria-labelledby={titleId}
      className="fixed inset-0 m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-[#ACA9FF] bg-[#ECF0FA] p-5 text-[#0A0332] shadow-xl backdrop:bg-[#0A0332]/50"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 id={titleId} className="text-lg font-extrabold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="rounded-full p-2 hover:bg-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
