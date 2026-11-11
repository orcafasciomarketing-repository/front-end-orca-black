import styles from "./AdminLayout.module.css";

import { useContext, useState } from "react";
import { NavLink, Outlet } from "react-router";

import useTheme from "../../../shared/hooks/useTheme";
import ChangePasswordDialog from "../../auth/components/ChangePasswordDialog/ChangePasswordDialog";
import CampaignSelect from "../../campaigns/components/CampaignSelect/CampaignSelect";
import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";
import { AuthContext } from "../../auth/context/AuthContext";
import usePermissions from "../../auth/hooks/usePermissions";
import {
  AlertIcon,
  ChartIcon,
  DashboardIcon,
  FlagIcon,
  ForecastIcon,
  GiftIcon,
  KeyIcon,
  LogoutIcon,
  MoonIcon,
  SunIcon,
  TargetIcon,
  UploadIcon,
  UsersIcon,
} from "../components/Icons/Icons";
import SaleToasts from "../components/SaleToasts/SaleToasts";

// allow: permissão de getPermissions que mostra o item (sem ela, a rota também manda de volta para o dashboard)
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { to: "/minha-area", label: "Minha área", end: true, Icon: DashboardIcon, allow: "isPerson" },
      { to: "/minha-area/metas", label: "Minhas metas", end: false, Icon: TargetIcon, allow: "isVendor" },
    ],
  },
  {
    label: "Campanha",
    campaignSelect: true,
    items: [
      { to: "/admin", label: "Dashboard", end: true, Icon: DashboardIcon, allow: "canSeeAdmin" },
      { to: "/admin/graficos", label: "Gráficos", end: false, Icon: ChartIcon, allow: "canSeeAdmin" },
      { to: "/admin/previsao", label: "Previsão", end: false, Icon: ForecastIcon, allow: "canSeeAdmin" },
      { to: "/admin/premios", label: "Prêmios", end: false, Icon: GiftIcon, allow: "canSeeAdmin" },
    ],
  },
  {
    label: "Metas do mês",
    items: [
      {
        to: "/admin/metas/vendedores",
        label: "Metas por vendedor",
        end: false,
        Icon: TargetIcon,
        allow: "canSeeGoals",
      },
      { to: "/admin/metas", label: "Cadastro de metas", end: true, Icon: TargetIcon, allow: "canSeeGoals" },
    ],
  },
  {
    label: "Administração",
    items: [
      { to: "/admin/campanhas", label: "Campanhas", end: false, Icon: FlagIcon, allow: "canManageCampaigns" },
      { to: "/admin/importacao", label: "Importação", end: false, Icon: UploadIcon, allow: "isMaster" },
      { to: "/admin/erros", label: "Erros", end: false, Icon: AlertIcon, allow: "isMaster" },
      { to: "/admin/usuarios", label: "Usuários", end: false, Icon: UsersIcon, allow: "canSeeUsers" },
    ],
  },
];

const PERSON_REFRESH_SPREAD_MS = 3000;

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

export default function AdminLayout() {
  const permissions = usePermissions();
  const navGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.allow || permissions[item.allow]),
  })).filter((group) => group.items.length > 0);
  const { theme, isDark, toggleTheme } = useTheme();
  const auth = useContext(AuthContext);
  const isLoggedIn = Boolean(auth?.state.user);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const selectedCampaign = useSelectedCampaign();

  const handlePasswordChanged = ({ user, token }) => {
    auth.dispatch({ type: "SET_USER", payload: { user, token } });
  };

  return (
    <div className={`container ${styles.layout}`} data-theme={theme}>
      <aside className={styles.sidebar}>
        <img className={styles.logo} src="/orca-black-logo.png" alt="Orça Black" />
        <nav className={styles.navGroups} aria-label="Menu principal">
          {navGroups.map((group) => (
            <div key={group.label ?? "pessoal"} className={styles.navGroup}>
              {group.label && <p className={styles.navGroupLabel}>{group.label}</p>}
              {group.campaignSelect && <CampaignSelect />}
              <ul className={styles.nav}>
                {group.items.map(({ to, label, end, Icon }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} className={navLinkClass}>
                      <Icon />
                      <span>{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
        <Outlet key={permissions.canSeeAdmin ? campaignKey(selectedCampaign) : "pessoal"} />
      </main>
      <SaleToasts spreadMs={permissions.isPerson ? PERSON_REFRESH_SPREAD_MS : 0} />
      {isChangingPassword && (
        <ChangePasswordDialog onClose={() => setIsChangingPassword(false)} onChanged={handlePasswordChanged} />
      )}
    </div>
  );
}
