import styles from "./CampaignForm.module.css";

import { useState } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import MoneyInput from "../../../goals/components/MoneyInput/MoneyInput";
import { fromCents, toCents } from "../../../goals/utils/goalMath";
import { getCampaignErrorMessage } from "../../api/campaignsApi";

const EMPTY = { name: "", start: "", end: "", b2b: null, b2g: null, active: false, hasBlackTier: false };

const toForm = (campaign) =>
  campaign
    ? {
        name: campaign.name,
        start: campaign.start,
        end: campaign.end,
        b2b: campaign.goals.b2b,
        b2g: campaign.goals.b2g,
        active: campaign.active,
        hasBlackTier: campaign.hasBlackTier,
      }
    : EMPTY;

const validate = (form) => {
  if (!form.name.trim()) return "Informe o nome da campanha";
  if (!form.start || !form.end) return "Informe o início e o fim da campanha";
  if (form.end < form.start) return "A data de fim precisa ser igual ou depois do início";
  if (form.b2b === null || form.b2g === null) return "Informe a meta B2B e a meta B2G (pode ser R$ 0,00)";
  return "";
};

export default function CampaignForm({ campaign, create, update, onDone }) {
  const [form, setForm] = useState(() => toForm(campaign));
  const [formError, setFormError] = useState("");
  const isEditing = Boolean(campaign);
  const mutation = isEditing ? update : create;
  const total = fromCents(toCents(form.b2b) + toCents(form.b2g));

  const changeField = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const changeMoney = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const error = validate(form);
    setFormError(error);
    if (error) return;

    const payload = {
      name: form.name.trim(),
      start: form.start,
      end: form.end,
      goals: { b2b: form.b2b, b2g: form.b2g },
      hasBlackTier: form.hasBlackTier,
      ...(form.active || !isEditing ? { active: form.active } : {}),
    };
    const options = {
      onSuccess: () => {
        if (isEditing) onDone();
        else setForm(EMPTY);
      },
    };
    if (isEditing) update.mutate({ id: campaign.id, campaign: payload }, options);
    else create.mutate(payload, options);
  };

  return (
    <form
      className={`widget ${styles.form}`}
      onSubmit={handleSubmit}
      aria-label={isEditing ? `Editar campanha ${campaign.name}` : "Cadastrar campanha"}
    >
      <header className="header">
        <h2 className="title">{isEditing ? `Editar campanha · ${campaign.name}` : "Nova campanha"}</h2>
      </header>
      <div className={styles.body}>
        <div className={styles.fields}>
          <label className={`${styles.field} ${styles.wide}`}>
            <span className={styles.label}>Nome</span>
            <input
              className={styles.input}
              type="text"
              maxLength={80}
              value={form.name}
              onChange={changeField("name")}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Início</span>
            <input className={styles.input} type="date" value={form.start} onChange={changeField("start")} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Fim</span>
            <input className={styles.input} type="date" value={form.end} onChange={changeField("end")} />
          </label>
          <div className={styles.field}>
            <span className={styles.label}>Meta B2B</span>
            <MoneyInput label="Meta B2B" value={form.b2b} onChange={changeMoney("b2b")} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Meta B2G</span>
            <MoneyInput label="Meta B2G" value={form.b2g} onChange={changeMoney("b2g")} />
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Meta total</span>
            <output className={styles.total} aria-label="Meta total">
              {formatCurrency(total)}
            </output>
          </div>
        </div>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={form.active}
            disabled={isEditing && campaign.active}
            onChange={changeField("active")}
          />
          <span>
            Campanha ativa
            <span className={styles.checkHint}>
              {isEditing && campaign.active
                ? "Esta já é a ativa. Para trocar, marque outra campanha como ativa"
                : "As TVs e a área dos vendedores passam a mostrar esta campanha"}
            </span>
          </span>
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={form.hasBlackTier} onChange={changeField("hasBlackTier")} />
          <span>
            Criar a Meta black
            <span className={styles.checkHint}>
              No cadastro de metas do mês em que a campanha começa, com a meta de cada setor desta campanha
            </span>
          </span>
        </label>
        {formError && <p className={styles.error}>{formError}</p>}
        {mutation.isError && (
          <p className={styles.error}>Não foi possível salvar: {getCampaignErrorMessage(mutation.error)}</p>
        )}
        {create.isSuccess && !isEditing && <p className={styles.success}>Campanha cadastrada</p>}
        <div className={styles.buttons}>
          <button className={styles.primaryButton} type="submit" disabled={mutation.isPending}>
            {isEditing ? "Salvar campanha" : "Cadastrar campanha"}
          </button>
          {isEditing && (
            <button className={styles.secondaryButton} type="button" onClick={onDone}>
              Cancelar edição
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
