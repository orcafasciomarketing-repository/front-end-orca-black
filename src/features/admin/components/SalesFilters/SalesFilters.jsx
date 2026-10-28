import styles from "./SalesFilters.module.css";

import { useExportSales } from "../../hooks/useExportSales";
import { getVendorLabel, useVendors } from "../../hooks/useVendors";
import { useWeekOptions } from "../../hooks/useWeekOptions";
import { DownloadIcon } from "../Icons/Icons";

export default function SalesFilters({ selectedVendorId, onVendorChange, selectedWeek, onWeekChange }) {
  const { vendors, vendorsFailed } = useVendors();
  const { weeks } = useWeekOptions();
  const { exportSales, isExporting, exportFailed } = useExportSales();

  const selectedVendor = vendors.find((vendor) => vendor._id === selectedVendorId) ?? null;

  return (
    <div className={styles.filters}>
      <label className={styles.field}>
        <span className={styles.label}>Semana</span>
        <select
          className={styles.select}
          aria-label="Filtrar por semana"
          value={selectedWeek}
          onChange={(event) => onWeekChange(event.target.value)}
        >
          <option value="">Todas as semanas</option>
          {weeks.map((week) => (
            <option key={week.key} value={week.key}>
              {week.label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Vendedor</span>
        <select
          className={styles.select}
          aria-label="Filtrar por vendedor"
          value={selectedVendorId}
          onChange={(event) => onVendorChange(event.target.value)}
        >
          <option value="">Todos</option>
          {vendorsFailed && (
            <option value="" disabled>
              Não foi possível carregar os vendedores
            </option>
          )}
          {vendors.map((vendor) => (
            <option key={vendor._id} value={vendor._id}>
              {getVendorLabel(vendor)}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.field}>
        {exportFailed && <span className={styles.exportError}>Não foi possível exportar</span>}
        <button
          className={styles.exportButton}
          type="button"
          disabled={isExporting}
          onClick={() => exportSales({ vendor: selectedVendor, weekKey: selectedWeek })}
        >
          <DownloadIcon />
          {isExporting ? "Exportando..." : "Exportar"}
        </button>
      </div>
    </div>
  );
}
