import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { LinkProps } from "next/link";

interface NavLinkProps extends LinkProps {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, href, ...props }, ref) => {
    // Next.js doesn't expose isActive; must compare pathname
    const isActive =
      typeof window !== "undefined" && window.location.pathname === href;
    // pending state not available client side easily
    return (
      <Link
        href={href as string}
        {...props}
        ref={ref}
        className={cn(className, isActive && activeClassName)}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export default NavLink;
