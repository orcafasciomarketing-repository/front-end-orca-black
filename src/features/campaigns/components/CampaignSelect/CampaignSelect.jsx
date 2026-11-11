import styles from "./CampaignSelect.module.css";

import { useContext, useEffect } from "react";
import { QueryClientContext } from "@tanstack/react-query";

import { useCampaignOptions } from "../../hooks/useCampaigns";
import { setSelectedCampaign, useSelectedCampaign } from "../../utils/campaignSelection";

export default function CampaignSelect() {
  const queryClient = useContext(QueryClientContext);

  return queryClient ? <CampaignSelectField /> : null;
}

function CampaignSelectField() {
  const { campaigns } = useCampaignOptions();
  const selected = useSelectedCampaign();
  const active = campaigns?.find((campaign) => campaign.active) ?? null;
  const isKnown = !selected || Boolean(campaigns?.some((campaign) => campaign.id === selected));

  useEffect(() => {
    if (campaigns && !isKnown) setSelectedCampaign("");
  }, [campaigns, isKnown]);

  if (!campaigns) {
    return <p className={styles.loading}>Carregando campanhas...</p>;
  }

  const value = (isKnown && selected) || active?.id || "";

  return (
    <select
      className={styles.select}
      aria-label="Campanha"
      value={value}
      onChange={(event) => setSelectedCampaign(event.target.value === active?.id ? "" : event.target.value)}
    >
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.active ? `${campaign.name} (ativa)` : campaign.name}
        </option>
      ))}
    </select>
  );
}
