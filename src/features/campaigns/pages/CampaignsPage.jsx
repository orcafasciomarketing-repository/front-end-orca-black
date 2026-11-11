import styles from "./CampaignsPage.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import { formatShortDay } from "../../goals/utils/goalMath";
import CampaignForm from "../components/CampaignForm/CampaignForm";
import { getCampaignErrorMessage } from "../api/campaignsApi";
import { useCampaignMutations, useCampaigns } from "../hooks/useCampaigns";

const formatDay = (day) => `${formatShortDay(day)}/${day.slice(0, 4)}`;

const toPayload = (campaign) => ({
  name: campaign.name,
  start: campaign.start,
  end: campaign.end,
  goals: { b2b: campaign.goals.b2b, b2g: campaign.goals.b2g },
  hasBlackTier: campaign.hasBlackTier,
});

const salesText = (sales) =>
  `${sales.count} ${sales.count === 1 ? "venda" : "vendas"} · ${formatCurrency(sales.total)}`;

export default function CampaignsPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Cadastro de campanhas"
        description="Cadastre as campanhas e escolha a ativa, que é a das TVs e da área dos vendedores. No menu, dá para ver qualquer campanha"
      />
      <ErrorBoundary location="Admin › campanhas">
        <Suspense fallback={<WidgetFallback title="Campanhas cadastradas" />}>
          <CampaignsContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function CampaignsContent() {
  const { campaigns } = useCampaigns();
  const { create, update, remove } = useCampaignMutations();
  const [editingId, setEditingId] = useState(null);
  const editing = campaigns.find((campaign) => campaign.id === editingId) ?? null;
  const isBusy = update.isPending || remove.isPending;

  const activate = (campaign) => {
    if (
      window.confirm(`Tornar "${campaign.name}" a campanha ativa? As TVs e a área dos vendedores passam a mostrar ela.`)
    ) {
      update.mutate({ id: campaign.id, campaign: { ...toPayload(campaign), active: true } });
    }
  };

  const handleDelete = (campaign) => {
    if (window.confirm(`Excluir a campanha "${campaign.name}"? As vendas continuam no sistema.`)) {
      remove.mutate(campaign.id);
    }
  };

  return (
    <>
      <section className="widget" aria-label="Campanhas cadastradas">
        <header className="header">
          <h2 className="title">Campanhas cadastradas</h2>
          <span className={styles.count}>{campaigns.length}</span>
        </header>
        <div className={styles.body}>
          <p className={styles.help}>
            As vendas entram na campanha pela data da venda, do início ao fim. A Meta black aparece no cadastro de metas
            do mês em que a campanha começa, com as metas de setor dela.
          </p>
          {update.isError && !editing && (
            <p className={styles.error}>Não foi possível salvar: {getCampaignErrorMessage(update.error)}</p>
          )}
          {remove.isError && (
            <p className={styles.error}>Não foi possível excluir: {getCampaignErrorMessage(remove.error)}</p>
          )}
          <div className={styles.scroll}>
            <table className={styles.table} aria-label="Campanhas">
              <thead>
                <tr>
                  <th scope="col">Campanha</th>
                  <th scope="col">Período</th>
                  <th scope="col" className={styles.number}>
                    Meta B2B
                  </th>
                  <th scope="col" className={styles.number}>
                    Meta B2G
                  </th>
                  <th scope="col" className={styles.number}>
                    Meta total
                  </th>
                  <th scope="col" className={styles.number}>
                    Vendas
                  </th>
                  <th scope="col">
                    <span className={styles.srOnly}>Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className={campaign.id === editingId ? styles.selected : undefined}>
                    <th scope="row">
                      <span className={styles.name}>{campaign.name}</span>
                      <span className={styles.tags}>
                        {campaign.active && <span className={styles.activeTag}>Ativa</span>}
                        {campaign.hasBlackTier && <span className={styles.blackTag}>Meta black</span>}
                      </span>
                    </th>
                    <td>
                      {formatDay(campaign.start)} a {formatDay(campaign.end)}
                    </td>
                    <td className={styles.number}>{formatCurrency(campaign.goals.b2b)}</td>
                    <td className={styles.number}>{formatCurrency(campaign.goals.b2g)}</td>
                    <td className={styles.number}>{formatCurrency(campaign.goal)}</td>
                    <td className={styles.number}>{salesText(campaign.sales)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.secondaryButton}
                          type="button"
                          aria-label={`Editar ${campaign.name}`}
                          onClick={() => setEditingId(campaign.id)}
                        >
                          Editar
                        </button>
                        {!campaign.active && (
                          <button
                            className={styles.secondaryButton}
                            type="button"
                            disabled={isBusy}
                            aria-label={`Tornar ${campaign.name} a campanha ativa`}
                            onClick={() => activate(campaign)}
                          >
                            Tornar ativa
                          </button>
                        )}
                        {!campaign.active && (
                          <button
                            className={styles.dangerButton}
                            type="button"
                            disabled={isBusy}
                            aria-label={`Excluir ${campaign.name}`}
                            onClick={() => handleDelete(campaign)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <CampaignForm
        key={editingId ?? "nova"}
        campaign={editing}
        create={create}
        update={update}
        onDone={() => setEditingId(null)}
      />
    </>
  );
}
