import Image from "next/image";
import {
  LOGO_CLASS,
  LOGO_INTRINSIC_HEIGHT,
  LOGO_INTRINSIC_WIDTH,
  LOGO_SRC,
  LOGO_SRC_ON_LIGHT,
} from "@/lib/branding";

type Props = {
  /** onDark = red + white text. onLight = red + black text. */
  variant: "onDark" | "onLight";
  /** Inverts against scrolling content behind the fixed header. */
  blend?: boolean;
  priority?: boolean;
  className?: string;
};

export default function BevelLogo({
  variant,
  blend = false,
  priority,
  className = "",
}: Props) {
  const src = variant === "onDark" ? LOGO_SRC : LOGO_SRC_ON_LIGHT;

  return (
    <Image
      src={src}
      alt="Bevel"
      width={LOGO_INTRINSIC_WIDTH}
      height={LOGO_INTRINSIC_HEIGHT}
      priority={priority}
      className={`${LOGO_CLASS.landingHeader} block ${blend ? "mix-blend-difference" : ""} ${className}`}
    />
  );
}
