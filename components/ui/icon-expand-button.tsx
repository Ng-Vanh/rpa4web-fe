import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface IconExpandButtonProps {
  icon: React.ReactNode;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
}

export function IconExpandButton({
  icon,
  text,
  onClick,
  disabled,
  variant = "outline",
}: IconExpandButtonProps) {
  const [locked, setLocked] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    setLocked(!locked); // click lần nữa để toggle lock
    if (onClick) onClick();
  };

  const handleMouseEnter = () => {
    // Nếu đã locked thì hover lần nữa => unlock
    if (locked) {
      setLocked(false);
    } else {
      setHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  const expanded = hovered || locked;

  return (
    <Button
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
      variant={variant}
      className={cn(
        "relative overflow-hidden transition-all duration-700 px-3",
        "flex justify-center items-center",
        expanded && "px-6"
      )}
    >
      <span className="flex items-center justify-center">
        {icon}
        <span
          className={cn(
            "ml-2 text-sm whitespace-nowrap transition-all duration-700",
            expanded ? "max-w-xs opacity-100" : "max-w-0 opacity-0"
          )}
        >
          {text}
        </span>
      </span>
    </Button>
  );
}
