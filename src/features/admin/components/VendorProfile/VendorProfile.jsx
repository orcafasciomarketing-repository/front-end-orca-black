import styles from "./VendorProfile.module.css";

import { Suspense, useEffect, useRef } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import ErrorBoundary from "../../../../shared/components/ErrorBoundary/ErrorBoundary";
import { useVendorProfile } from "../../hooks/useVendorProfile";
import { CHART_COLORS } from "../../utils/chartColors";
import { formatVariation } from "../../utils/chartScale";
import { formatDateTime } from "../../utils/formatDateTime";
import { variation } from "../../utils/salesInsights";
import Avatar from "../Avatar/Avatar";
import TimeSeriesChart from "../charts/TimeSeriesChart";

const STATUS_LABELS = { ativa: "Concluída", cancelada: "Cancelada" };

function WeekComparison({ thisWeek, lastWeek }) {
  const change = variation(thisWeek, lastWeek);

  if (change === null) {
    return <span className={styles.neutral}>sem vendas na semana passada</span>;
  }

  if (change === 0) {
    return <span className={styles.neutral}>igual à semana passada</span>;
  }

  const isUp = change > 0;

  return (
    <span className={isUp ? styles.up : styles.down}>
      <span aria-hidden="true">{isUp ? "▲" : "▼"}</span> {formatVariation(change)} vs semana passada
    </span>
  );
}

function ProfileContent({ vendorId, segment }) {
  const { profile } = useVendorProfile(vendorId, segment);

  if (!profile.vendor) {
    return <p className={styles.empty}>Nenhuma venda deste vendedor</p>;
  }

  const facts = [
    ["Total vendido", formatCurrency(profile.total)],
    ["Vendas concluídas", profile.count],
    ["Ticket médio", formatCurrency(profile.average)],
    ["Vendas novas", formatCurrency(profile.newSales)],
    ["Renovações", formatCurrency(profile.renewals)],
    ["Canceladas", profile.cancelled],
  ];

  return (
    <div className={styles.content}>
      <div className={styles.identity}>
        <Avatar name={profile.vendor.vendorName} imageUrl={profile.vendor.imageUrl} size="large" />
        <div>
          <p className={styles.job}>{profile.vendor.job}</p>
          {profile.position && (
            <p className={styles.position}>
              {profile.position}º de {profile.vendorsCount} em valor vendido
            </p>
          )}
        </div>
      </div>

      <div className={styles.highlights}>
        <div className={styles.highlight}>
          <span className={styles.highlightLabel}>Esta semana</span>
          <strong className={styles.highlightValue}>{formatCurrency(profile.thisWeek)}</strong>
          <WeekComparison thisWeek={profile.thisWeek} lastWeek={profile.lastWeek} />
        </div>
        <div className={styles.highlight}>
          <span className={styles.highlightLabel}>Sequência</span>
          <strong className={styles.highlightValue}>
            {profile.streak > 0 ? (
              <>
                <span aria-hidden="true">🔥 </span>
                {profile.streak} {profile.streak === 1 ? "dia" : "dias"}
              </>
            ) : (
              "—"
            )}
          </strong>
          <span className={styles.neutral}>dias seguidos com venda</span>
        </div>
      </div>

      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {profile.evolution.days.length > 1 && (
        <div className={styles.block}>
          <h3 className={styles.blockTitle}>Valor acumulado</h3>
          <TimeSeriesChart
            title={`Valor acumulado de ${profile.vendor.vendorName}`}
            days={profile.evolution.days}
            series={[{ key: "total", label: "Vendido", color: CHART_COLORS.blue, values: profile.evolution.values }]}
            formatValue={formatCurrency}
          />
        </div>
      )}

      <div className={styles.block}>
        <h3 className={styles.blockTitle}>Últimas vendas</h3>
        <ul className={styles.sales}>
          {profile.recentSales.map((sale) => (
            <li key={sale._id} className={styles.sale}>
              <span className={styles.saleName}>{sale.rdDealName}</span>
              <span className={sale.dealStatus === "ativa" ? styles.done : styles.cancelled}>
                {STATUS_LABELS[sale.dealStatus] ?? sale.dealStatus}
              </span>
              <span className={styles.saleValue}>{formatCurrency(sale.value)}</span>
              <span className={styles.saleDate}>{sale.realizedAt ? formatDateTime(sale.realizedAt) : "—"}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function VendorProfile({ vendor, segment = "", onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, [vendor.id]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${vendor.name}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.key === "Escape" && onClose()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{vendor.name}</h2>
          <button ref={closeRef} className={styles.close} type="button" aria-label="Fechar perfil" onClick={onClose}>
            ×
          </button>
        </header>
        <ErrorBoundary location="Admin › perfil do vendedor">
          <Suspense fallback={<p className={styles.empty}>Carregando perfil...</p>}>
            <ProfileContent vendorId={vendor.id} segment={segment} />
          </Suspense>
        </ErrorBoundary>
      </aside>
    </div>
  );
}
