"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom Sheet (mobil) / zentriertes Modal (≥ 768 px) auf Basis von Radix Dialog.
 * Inhalt scrollt innerhalb des Sheets; Header und Footer bleiben stehen.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <style>{`
          @keyframes kf-sheet-up { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
          @keyframes kf-fade { from { opacity: 0 } to { opacity: 1 } }
          .kf-sheet-overlay[data-state="open"] { animation: kf-fade var(--kf-dur) var(--kf-ease) }
          .kf-sheet-content[data-state="open"] { animation: kf-sheet-up var(--kf-dur) var(--kf-ease) }
          @media (min-width: 768px) {
            @keyframes kf-sheet-up { from { transform: translate(-50%, calc(-50% + 16px)); opacity: 0 } to { transform: translate(-50%, -50%); opacity: 1 } }
          }
        `}</style>
        <Dialog.Overlay className="kf-sheet-overlay fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "kf-sheet-content fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] flex-col rounded-t-lg border border-border bg-card shadow-kf focus:outline-none",
            "md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[600px] md:max-h-[85vh] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-lg",
            className,
          )}
        >
          <div aria-hidden className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong md:hidden" />
          <div className="flex items-start justify-between gap-3 px-4 pb-3 pt-3">
            <div className="min-w-0">
              <Dialog.Title className="display-upright text-lg leading-tight">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-sm text-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Schließen"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted hover:bg-card-hover hover:text-text"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
          {footer && <div className="pb-safe border-t border-border px-4 pt-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
