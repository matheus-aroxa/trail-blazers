import { useState } from "react";

import { cn } from "../../lib/cn";

export function Avatar({
  username,
  src,
  size = 26,
  className,
}: {
  username: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const classes = cn("flex-none rounded-full object-cover", className);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={`Avatar de ${username}`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={classes}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      className={cn(
        classes,
        "inline-flex items-center justify-center bg-linear-135 from-trail-500 to-trail-700",
        "font-semibold text-on-trail uppercase",
      )}
    >
      {username.slice(0, 1)}
    </span>
  );
}
