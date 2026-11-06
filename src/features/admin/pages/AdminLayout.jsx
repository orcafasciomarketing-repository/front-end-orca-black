import styles from "./AdminLayout.module.css";

import { NavLink, Outlet } from "react-router";

import usePermissions from "../../auth/hooks/usePermissions";
import { AlertIcon, ChartIcon, DashboardIcon, UploadIcon, UsersIcon } from "../components/Icons/Icons";

// adminOnly: b2b e b2g não veem no menu (e a rota manda de volta para o dashboard)
const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true, Icon: DashboardIcon },
  { to: "/admin/graficos", label: "Gráficos", end: false, Icon: ChartIcon },
  { to: "/admin/importacao", label: "Importação", end: false, Icon: UploadIcon, adminOnly: true },
  { to: "/admin/erros", label: "Erros", end: false, Icon: AlertIcon, adminOnly: true },
  { to: "/admin/usuarios", label: "Usuários", end: false, Icon: UsersIcon, adminOnly: true },
];

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

export default function AdminLayout() {
  const { isAdmin } = usePermissions();
  const navItems = NAV_ITEMS.filter((item) => isAdmin || !item.adminOnly);

  return (
    <div className={`container ${styles.layout}`}>
      <aside className={styles.sidebar}>
        <img className={styles.logo} src="/orca-black-logo.png" alt="Orça Black" />
        <nav aria-label="Menu principal">
          <ul className={styles.nav}>
            {navItems.map(({ to, label, end, Icon }) => (
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
