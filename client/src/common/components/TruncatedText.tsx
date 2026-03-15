import { useEffect, useRef, useState } from "react";

type Props = {
  text?: string | null;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  showToggle?: boolean;
};

export default function TruncatedText({
  text,
  maxLength = 28,
  placeholder = "-",
  className = "",
  buttonClassName = "ml-1 text-xs text-blue-600 hover:text-blue-700",
  showToggle = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const safeText = (text ?? "").trim();
  const isLong = safeText.length > maxLength;

  useEffect(() => {
    if (!showToggle || expanded || !safeText) return;

    const measureOverflow = () => {
      const el = textRef.current;
      if (!el) return;
      const overflows = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      setIsOverflowing(overflows);
    };

    measureOverflow();
    window.addEventListener("resize", measureOverflow);
    return () => window.removeEventListener("resize", measureOverflow);
  }, [safeText, showToggle, expanded]);

  if (!safeText) {
    return <span className={className}>{placeholder}</span>;
  }

  if (!showToggle) {
    const compactText = isLong ? `${safeText.slice(0, maxLength).trimEnd()}...` : safeText;
    return (
      <span className={className} title={isLong ? safeText : undefined}>
        {compactText}
      </span>
    );
  }

  return (
    <span className={`${className} inline-flex max-w-full items-baseline gap-1`}>
      <span
        ref={textRef}
        className={`${expanded ? "whitespace-normal break-words" : "truncate"} inline-block max-w-full`}
        title={!expanded && isOverflowing ? safeText : undefined}
      >
        {safeText}
      </span>
      {isOverflowing ? (
        <button
          type="button"
          className={buttonClassName}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Show less" : "View full"}
        </button>
      ) : null}
    </span>
  );
}
