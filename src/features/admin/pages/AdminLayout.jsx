import styles from "./AdminLayout.module.css";

import { NavLink, Outlet } from "react-router";

import { AlertIcon, DashboardIcon } from "../components/Icons/Icons";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true, Icon: DashboardIcon },
  { to: "/admin/erros", label: "Erros", end: false, Icon: AlertIcon },
];

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

export default function AdminLayout() {
  return (
    <div className={`container ${styles.layout}`}>
      <aside className={styles.sidebar}>
        <img className={styles.logo} src="/orca-black-logo.png" alt="Orça Black" />
        <nav aria-label="Menu principal">
          <ul className={styles.nav}>
            {NAV_ITEMS.map(({ to, label, end, Icon }) => (
              <li key={to}>
                <NavLink to={to} end={end} className={navLinkClass}>
                  <Icon />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
