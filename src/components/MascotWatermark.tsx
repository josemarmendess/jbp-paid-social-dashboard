"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Persistent JBP mascot in the bottom-right corner of every page.
 * Hidden on mobile and when the asset isn't deployed yet.
 */
export function MascotWatermark() {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-6 right-6 z-20 hidden lg:block"
    >
      <div className="group pointer-events-auto opacity-60 transition-all duration-300 hover:opacity-100">
        <Image
          src="/mascot.png"
          alt=""
          width={60}
          height={60}
          onError={() => setOk(false)}
          className="h-[60px] w-[60px] origin-bottom select-none [animation:jbp-pulse_3s_ease-in-out_infinite] group-hover:[animation:jbp-wave_1.6s_ease-in-out_infinite]"
        />
      </div>
      <style>{`
        @keyframes jbp-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes jbp-wave {
          0%, 100% { transform: rotate(-3deg) scale(1.05); }
          50% { transform: rotate(3deg) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
