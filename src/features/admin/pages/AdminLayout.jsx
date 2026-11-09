import styles from "./AdminLayout.module.css";

import { useContext, useState } from "react";
import { NavLink, Outlet } from "react-router";

import useTheme from "../../../shared/hooks/useTheme";
import ChangePasswordDialog from "../../auth/components/ChangePasswordDialog/ChangePasswordDialog";
import { AuthContext } from "../../auth/context/AuthContext";
import usePermissions from "../../auth/hooks/usePermissions";
import {
  AlertIcon,
  ChartIcon,
  DashboardIcon,
  ForecastIcon,
  GiftIcon,
  KeyIcon,
  LogoutIcon,
  MoonIcon,
  SunIcon,
  UploadIcon,
  UsersIcon,
} from "../components/Icons/Icons";
import SaleToasts from "../components/SaleToasts/SaleToasts";

// allow: permissão de getPermissions que mostra o item (sem ela, a rota também manda de volta para o dashboard)
const NAV_ITEMS = [
  { to: "/minha-area", label: "Minha área", end: true, Icon: DashboardIcon, allow: "isPerson" },
  { to: "/admin", label: "Dashboard", end: true, Icon: DashboardIcon, allow: "canSeeAdmin" },
  { to: "/admin/graficos", label: "Gráficos", end: false, Icon: ChartIcon, allow: "canSeeAdmin" },
  { to: "/admin/previsao", label: "Previsão", end: false, Icon: ForecastIcon, allow: "canSeeAdmin" },
  { to: "/admin/premios", label: "Prêmios", end: false, Icon: GiftIcon, allow: "canSeeAdmin" },
  { to: "/admin/importacao", label: "Importação", end: false, Icon: UploadIcon, allow: "isMaster" },
  { to: "/admin/erros", label: "Erros", end: false, Icon: AlertIcon, allow: "isMaster" },
  { to: "/admin/usuarios", label: "Usuários", end: false, Icon: UsersIcon, allow: "canSeeUsers" },
];

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

export default function AdminLayout() {
  const permissions = usePermissions();
  const navItems = NAV_ITEMS.filter((item) => !item.allow || permissions[item.allow]);
  const { theme, isDark, toggleTheme } = useTheme();
  const auth = useContext(AuthContext);
  const isLoggedIn = Boolean(auth?.state.user);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChanged = ({ user, token }) => {
    auth.dispatch({ type: "SET_USER", payload: { user, token } });
  };

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
        <div className={styles.sidebarFooter}>
          {isLoggedIn && (
            <button className={styles.footerButton} type="button" onClick={() => setIsChangingPassword(true)}>
              <KeyIcon />
              <span>Trocar senha</span>
            </button>
          )}
          <button className={styles.themeToggle} type="button" aria-pressed={isDark} onClick={toggleTheme}>
            {isDark ? <SunIcon /> : <MoonIcon />}
            <span>Modo escuro</span>
          </button>
          {isLoggedIn && (
            <button className={styles.footerButton} type="button" onClick={() => auth.logout()}>
              <LogoutIcon />
              <span>Sair</span>
            </button>
          )}
        </div>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
      <SaleToasts />
      {isChangingPassword && (
        <ChangePasswordDialog onClose={() => setIsChangingPassword(false)} onChanged={handlePasswordChanged} />
      )}
    </div>
  );
}
