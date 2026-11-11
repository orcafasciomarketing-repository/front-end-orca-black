import styles from "./AdminMenu.module.css";

import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";

import { GearIcon } from "../Icons/Icons";

const isActivePath = (pathname, to) => pathname === to || pathname.startsWith(`${to}/`);

export default function AdminMenu({ items, buttonClassName, activeClassName }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const isActive = items.some((item) => isActivePath(pathname, item.to));

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div ref={ref} className={styles.wrapper}>
      {open && (
        <div className={styles.popover} role="menu" aria-label="Administração">
          <p className={styles.title}>Administração</p>
          {items.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              role="menuitem"
              className={({ isActive: active }) => `${styles.item} ${active ? styles.itemActive : ""}`}
              onClick={() => setOpen(false)}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      )}
      <button
        className={`${buttonClassName} ${isActive ? activeClassName : ""}`}
        type="button"
        aria-label="Administração"
        title="Administração"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <GearIcon />
      </button>
    </div>
  );
}
