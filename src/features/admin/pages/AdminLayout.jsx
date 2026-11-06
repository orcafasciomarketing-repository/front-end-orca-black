import styles from "./AdminLayout.module.css";

import { NavLink, Outlet } from "react-router";

import useTheme from "../../../shared/hooks/useTheme";
import usePermissions from "../../auth/hooks/usePermissions";
import {
  AlertIcon,
  ChartIcon,
  DashboardIcon,
  ForecastIcon,
  MoonIcon,
  SunIcon,
  UploadIcon,
  UsersIcon,
} from "../components/Icons/Icons";
import SaleToasts from "../components/SaleToasts/SaleToasts";

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
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <div className={`container ${styles.layout}`} data-theme={theme}>
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
        <button className={styles.themeToggle} type="button" aria-pressed={isDark} onClick={toggleTheme}>
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span>Modo escuro</span>
        </button>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
      <SaleToasts />
    </div>
  );
}
