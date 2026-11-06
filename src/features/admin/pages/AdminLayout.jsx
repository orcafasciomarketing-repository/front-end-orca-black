import styles from "./AdminLayout.module.css";

import { NavLink, Outlet } from "react-router";

import usePermissions from "../../auth/hooks/usePermissions";
import { AlertIcon, ChartIcon, DashboardIcon, ForecastIcon, UploadIcon, UsersIcon } from "../components/Icons/Icons";

// allow: permissão de getPermissions que mostra o item (sem ela, a rota também manda de volta para o dashboard)
const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true, Icon: DashboardIcon },
  { to: "/admin/graficos", label: "Gráficos", end: false, Icon: ChartIcon },
  { to: "/admin/previsao", label: "Previsão", end: false, Icon: ForecastIcon },
  { to: "/admin/importacao", label: "Importação", end: false, Icon: UploadIcon, allow: "isMaster" },
  { to: "/admin/erros", label: "Erros", end: false, Icon: AlertIcon, allow: "isMaster" },
  { to: "/admin/usuarios", label: "Usuários", end: false, Icon: UsersIcon, allow: "canSeeUsers" },
];

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

export default function AdminLayout() {
  const permissions = usePermissions();
  const navItems = NAV_ITEMS.filter((item) => !item.allow || permissions[item.allow]);

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
