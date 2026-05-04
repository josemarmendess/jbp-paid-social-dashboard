"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

const noopSubscribe = () => () => {};
function useIsMounted(): boolean {
  // useSyncExternalStore returns false during SSR and true on the client,
  // mirroring the "isMounted" pattern without the lint warning that calling
  // setState in an effect would trigger.
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

interface PopoverCoords {
  top: number;
  left: number;
  arrowX: number;
  side: "top" | "bottom";
}

const TOOLTIP_W = 280;
const VIEWPORT_MARGIN = 8;

/**
 * Hover/focus tooltip that renders into a portal so it can never be clipped
 * by an `overflow: hidden` ancestor. Position is computed relative to the
 * trigger and clamped to the viewport. Flips above/below based on space.
 */
export function Tooltip({ content, children }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<PopoverCoords | null>(null);
  const mounted = useIsMounted();

  // Recompute position when the tooltip opens.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipH = tooltipRef.current?.offsetHeight ?? 60;
    const triggerCx = triggerRect.left + triggerRect.width / 2;
    // Clamp left/right.
    const halfW = TOOLTIP_W / 2;
    const minLeft = VIEWPORT_MARGIN;
    const maxLeft = window.innerWidth - VIEWPORT_MARGIN - TOOLTIP_W;
    const idealLeft = triggerCx - halfW;
    const left = Math.max(minLeft, Math.min(idealLeft, maxLeft));
    const arrowX = Math.max(8, Math.min(triggerCx - left, TOOLTIP_W - 8));
    // Decide above or below based on available space.
    const spaceAbove = triggerRect.top;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const fitsAbove = spaceAbove >= tooltipH + 12;
    const side: "top" | "bottom" = fitsAbove || spaceAbove > spaceBelow ? "top" : "bottom";
    const top =
      side === "top"
        ? triggerRect.top - tooltipH - 8
        : triggerRect.bottom + 8;
    setCoords({ top, left, arrowX, side });
  }, [open]);

  // Recompute on scroll/resize while open so the tooltip tracks the trigger.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => setOpen(false);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {mounted && open && coords
        ? createPortal(
            <div
              ref={tooltipRef}
              role="tooltip"
              id={id}
              className="pointer-events-none fixed z-[100] rounded-md border border-[color:var(--color-border-strong)] bg-[color:var(--color-text-primary)] px-3 py-2 text-[12px] leading-snug text-white shadow-xl"
              style={{
                top: coords.top,
                left: coords.left,
                width: TOOLTIP_W,
              }}
            >
              <span
                aria-hidden="true"
                className="absolute h-2 w-2 rotate-45 bg-[color:var(--color-text-primary)]"
                style={{
                  left: coords.arrowX - 4,
                  [coords.side === "top" ? "bottom" : "top"]: -4,
                }}
              />
              {content}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

interface MetricLabelProps {
  label: string;
  tooltip: React.ReactNode;
  iconSize?: number;
  className?: string;
}

export function MetricLabel({
  label,
  tooltip,
  iconSize = 12,
  className,
}: MetricLabelProps) {
  return (
    <span
      className={["inline-flex items-center gap-1", className]
        .filter(Boolean)
        .join(" ")}
    >
      <span>{label}</span>
      <Tooltip content={tooltip}>
        <Info
          aria-label={`About ${label}`}
          tabIndex={0}
          className="text-zinc-400 outline-none transition-colors hover:text-[color:var(--color-text-primary)] focus-visible:text-[color:var(--color-text-primary)]"
          style={{ width: iconSize, height: iconSize }}
          strokeWidth={2}
        />
      </Tooltip>
    </span>
  );
}
