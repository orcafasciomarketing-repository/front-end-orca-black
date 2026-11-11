import styles from "./AdminLayout.module.css";

import { useContext, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import useTheme from "../../../shared/hooks/useTheme";
import ChangePasswordDialog from "../../auth/components/ChangePasswordDialog/ChangePasswordDialog";
import CampaignSelect from "../../campaigns/components/CampaignSelect/CampaignSelect";
import { campaignKey, useSelectedCampaign } from "../../campaigns/utils/campaignSelection";
import { AuthContext } from "../../auth/context/AuthContext";
import usePermissions from "../../auth/hooks/usePermissions";
import { ROLE_LABELS } from "../../auth/utils/permissions";
import {
  AlertIcon,
  ChartIcon,
  ChevronIcon,
  DashboardIcon,
  FlagIcon,
  ForecastIcon,
  GiftIcon,
  KeyIcon,
  LogoutIcon,
  MoonIcon,
  ReportIcon,
  SunIcon,
  TargetIcon,
  UploadIcon,
  UsersIcon,
} from "../components/Icons/Icons";
import AdminMenu from "../components/AdminMenu/AdminMenu";
import SaleToasts from "../components/SaleToasts/SaleToasts";

const PERSON_ITEMS = [
  { to: "/minha-area", label: "Minha área", end: true, Icon: DashboardIcon, allow: "isPerson" },
  { to: "/minha-area/metas", label: "Minhas metas", end: false, Icon: TargetIcon, allow: "isVendor" },
];

const NAV_SECTIONS = [
  {
    key: "campanha",
    label: "Campanha",
    campaignSelect: true,
    items: [
      { to: "/admin", label: "Dashboard", end: true, Icon: DashboardIcon, allow: "canSeeAdmin" },
      { to: "/admin/graficos", label: "Gráficos", end: false, Icon: ChartIcon, allow: "canSeeAdmin" },
      { to: "/admin/previsao", label: "Previsão", end: false, Icon: ForecastIcon, allow: "canSeeAdmin" },
      { to: "/admin/premios", label: "Prêmios", end: false, Icon: GiftIcon, allow: "canSeeAdmin" },
      { to: "/admin/relatorios", label: "Relatórios", end: false, Icon: ReportIcon, allow: "canSeeAdmin" },
    ],
  },
  {
    key: "metas",
    label: "Metas do mês",
    items: [
      { to: "/admin/metas/vendedores", label: "Painel de metas", end: false, Icon: TargetIcon, allow: "canSeeGoals" },
      { to: "/admin/metas/cadastradas", label: "Metas cadastradas", end: false, Icon: TargetIcon, allow: "canSeeGoals" },
      { to: "/admin/metas", label: "Cadastro de metas", end: true, Icon: TargetIcon, allow: "canSeeGoals" },
      { to: "/admin/metas/relatorios", label: "Relatórios", end: false, Icon: ReportIcon, allow: "canSeeGoals" },
    ],
  },
];

const ADMIN_ITEMS = [
  { to: "/admin/campanhas", label: "Cadastro de campanhas", Icon: FlagIcon, allow: "canManageCampaigns" },
  { to: "/admin/importacao", label: "Importação", Icon: UploadIcon, allow: "isMaster" },
  { to: "/admin/erros", label: "Erros", Icon: AlertIcon, allow: "isMaster" },
  { to: "/admin/usuarios", label: "Usuários", Icon: UsersIcon, allow: "canSeeUsers" },
];

const SECTIONS_STORAGE_KEY = "admin-menu-sections";

const readOpenSections = () => {
  try {
    return JSON.parse(window.localStorage.getItem(SECTIONS_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

const saveOpenSections = (value) => {
  try {
    window.localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // sem armazenamento: o menu abre como padrão na próxima vez
  }
};

const PERSON_REFRESH_SPREAD_MS = 3000;

const IMPERSONATION_HINT = "Indisponível no modo acessar como. Use “Voltar para minha conta” no topo";

const navLinkClass = ({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

export default function AdminLayout() {
  const permissions = usePermissions();
  const allowed = (item) => !item.allow || permissions[item.allow];
  const personItems = PERSON_ITEMS.filter(allowed);
  const sections = NAV_SECTIONS.map((section) => ({ ...section, items: section.items.filter(allowed) })).filter(
    (section) => section.items.length > 0,
  );
  const adminItems = ADMIN_ITEMS.filter(allowed);
  const [openSections, setOpenSections] = useState(readOpenSections);
  const isOpen = (key) => openSections[key] !== false;

  const toggleSection = (key) => {
    const next = { ...openSections, [key]: !isOpen(key) };
    setOpenSections(next);
    saveOpenSections(next);
  };
  const { theme, isDark, toggleTheme } = useTheme();
  const auth = useContext(AuthContext);
  const isLoggedIn = Boolean(auth?.state.user);
  const impersonatedBy = auth?.state.impersonatedBy ?? null;
  const navigate = useNavigate();
  const [isLeaving, setIsLeaving] = useState(false);

  const leaveImpersonation = async () => {
    setIsLeaving(true);
    await auth.stopImpersonation();
    setIsLeaving(false);
    navigate("/admin/usuarios");
  };
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
          {personItems.length > 0 && <NavItems items={personItems} />}
          {sections.map((section) => {
            const open = isOpen(section.key);
            const listId = `menu-${section.key}`;
            return (
              <div key={section.key} className={styles.navGroup}>
                <button
                  className={`${styles.sectionToggle} ${open ? styles.sectionOpen : ""}`}
                  type="button"
                  aria-expanded={open}
                  aria-controls={listId}
                  onClick={() => toggleSection(section.key)}
                >
                  <span>{section.label}</span>
                  <ChevronIcon />
                </button>
                {open && (
                  <div id={listId} className={styles.sectionBody}>
                    {section.campaignSelect && <CampaignSelect />}
                    <NavItems items={section.items} />
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className={styles.sidebarFooter}>
          {!impersonatedBy && (
            <AdminMenu
              items={adminItems}
              buttonClassName={styles.footerButton}
              activeClassName={styles.footerButtonActive}
            />
          )}
          {isLoggedIn && (
            <button
              className={styles.footerButton}
              type="button"
              aria-label="Trocar senha"
              title={impersonatedBy ? IMPERSONATION_HINT : "Trocar senha"}
              disabled={Boolean(impersonatedBy)}
              onClick={() => setIsChangingPassword(true)}
            >
              <KeyIcon />
            </button>
          )}
          <button
            className={styles.themeToggle}
            type="button"
            aria-label="Modo escuro"
            title={isDark ? "Desligar o modo escuro" : "Ligar o modo escuro"}
            aria-pressed={isDark}
            onClick={toggleTheme}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          {isLoggedIn && (
            <button
              className={styles.footerButton}
              type="button"
              aria-label="Sair"
              title={impersonatedBy ? IMPERSONATION_HINT : "Sair"}
              disabled={Boolean(impersonatedBy)}
              onClick={() => auth.logout()}
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </aside>
      <main className={styles.main}>
        {impersonatedBy && (
          <div className={styles.impersonation} role="status">
            <span>
              Você está vendo como <strong>{auth.state.user.email}</strong> (
              {ROLE_LABELS[auth.state.user.role] ?? auth.state.user.role}). É só para ver: nada pode ser alterado.
            </span>
            <button
              className={styles.impersonationButton}
              type="button"
              disabled={isLeaving}
              onClick={leaveImpersonation}
            >
              {isLeaving ? "Voltando..." : "Voltar para minha conta"}
            </button>
          </div>
        )}
        <Outlet key={permissions.canSeeAdmin ? campaignKey(selectedCampaign) : "pessoal"} />
      </main>
      <SaleToasts spreadMs={permissions.isPerson ? PERSON_REFRESH_SPREAD_MS : 0} />
      {isChangingPassword && (
        <ChangePasswordDialog onClose={() => setIsChangingPassword(false)} onChanged={handlePasswordChanged} />
      )}
    </div>
  );
}

function NavItems({ items }) {
  return (
    <ul className={styles.nav}>
      {items.map(({ to, label, end, Icon }) => (
        <li key={to}>
          <NavLink to={to} end={end} className={navLinkClass}>
            <Icon />
            <span>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
