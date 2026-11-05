import React, { useState } from 'react';

interface PesOSLogoProps {
  className?: string;
  showTagline?: boolean;
  taglineClassName?: string;
  imageHeightClass?: string;
}

export const PesOSLogo: React.FC<PesOSLogoProps> = ({
  className = '',
  showTagline = false,
  taglineClassName = '',
  imageHeightClass = 'h-8 md:h-9',
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {!imgError ? (
        <div className="relative flex items-center shrink-0">
          {/* Dark Mode: Crisp White OS */}
          <img
            src="/pesos-logo-dark.png"
            alt="pesOS"
            onError={() => setImgError(true)}
            className={`${imageHeightClass} w-auto object-contain hidden dark:block shrink-0`}
          />
          {/* Light Mode: Dark Slate OS (#0F172A) */}
          <img
            src="/pesos-logo-light.png"
            alt="pesOS"
            onError={() => setImgError(true)}
            className={`${imageHeightClass} w-auto object-contain block dark:hidden shrink-0`}
          />
        </div>
      ) : (
        /* Pure Vector SVG Fallback with Cyan Swoop on 'p' and Adaptive 'OS' */
        <svg
          viewBox="0 0 280 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`${imageHeightClass} w-auto shrink-0`}
        >
          <path
            d="M 28 68 C 34 50, 48 38, 76 34 C 54 38, 38 52, 34 68 Z"
            fill="#38BDF8"
          />
          <text
            x="12"
            y="62"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontStyle="italic"
            fontWeight="900"
            fontSize="64"
            letterSpacing="-2"
            fill="#006AFF"
          >
            pes
          </text>
          <text
            x="142"
            y="62"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontStyle="italic"
            fontWeight="900"
            fontSize="64"
            letterSpacing="-2"
            className="fill-slate-900 dark:fill-white"
          >
            OS
          </text>
        </svg>
      )}

      {showTagline && (
        <span
          className={`text-[10px] font-bold tracking-wider text-muted uppercase hidden sm:inline ${taglineClassName}`}
        >
          Smart Sari-Sari POS
        </span>
      )}
    </div>
  );
};
