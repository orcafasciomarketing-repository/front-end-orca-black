import styles from "./GoalSetupForm.module.css";

import { useState } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import Avatar from "../../../admin/components/Avatar/Avatar";
import { getGoalErrorMessage } from "../../api/goalsApi";
import { buildDraft, computeDraft, nextLevelKey, toPayload } from "../../utils/goalDraft";
import { formatMonth, formatShortDay, segmentParts, tiersOf, TYPE_LABELS } from "../../utils/goalMath";

const SOURCE_NOTES = {
  previous: (month) =>
    `Mês sem metas: os percentuais, níveis e o nível de cada vendedor vieram de ${formatMonth(month)}. Revise e salve.`,
  new: () => "Mês sem metas. Preencha a meta do setor, os níveis e salve.",
};

export default function GoalSetupForm({ month, segment, weeks, segmentData, save, remove }) {
  const [draft, setDraft] = useState(() => buildDraft(segmentData, weeks.length));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const computed = computeDraft(draft, weeks.length);
  const label = segment.toUpperCase();
  const tiers = tiersOf(draft.goal, Number(draft.superPercent) || 0, Number(draft.blackPercent) || 0);
  const parts = segmentParts(draft);

  const update = (changes) => {
    save.reset();
    setDraft((current) => ({ ...current, ...changes }));
  };

  const updatePerson = (vendorId, changes) =>
    update({
      people: draft.people.map((person) => (person.vendorId === vendorId ? { ...person, ...changes } : person)),
    });

  const updateLevel = (key, changes) =>
    update({ levels: draft.levels.map((level) => (level.key === key ? { ...level, ...changes } : level)) });

  const addLevel = () =>
    update({ levels: [...draft.levels, { key: nextLevelKey(draft.levels), name: "", weight: 1 }] });

  const removeLevel = (key) => {
    const levels = draft.levels.filter((level) => level.key !== key);
    update({
      levels,
      people: draft.people.map((person) => (person.level === key ? { ...person, level: levels[0].key } : person)),
    });
  };

  const redistribute = () =>
    update({ people: draft.people.map((person) => ({ ...person, manualGoal: null, manualWeeks: null })) });

  const changeWeek = (person, index, value) =>
    updatePerson(person.vendorId, { manualWeeks: person.weeks.map((week, i) => (i === index ? value : week)) });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!computed.canSave) return;
    save.mutate({ month, segment, payload: toPayload(draft, computed) });
  };

  const handleDelete = () => {
    remove.mutate({ month, segment }, { onSuccess: () => setConfirmDelete(false) });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label={`Metas ${label} de ${formatMonth(month)}`}>
      {draft.source !== "saved" && <p className={styles.notice}>{SOURCE_NOTES[draft.source](draft.sourceMonth)}</p>}

      <section className="widget" aria-label={`Meta do setor ${label}`}>
        <header className="header">
          <h2 className="title">Meta do setor {label}</h2>
        </header>
        <div className={styles.body}>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span className={styles.label}>Meta do mês (R$)</span>
              <input
                className={styles.input}
                type="number"
                min="0"
                step="0.01"
                value={draft.goal}
                onChange={(event) => update({ goal: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Renovação (%)</span>
              <input
                className={styles.input}
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={draft.farmPercent}
                onChange={(event) => update({ farmPercent: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Super meta (% da meta)</span>
              <input
                className={styles.input}
                type="number"
                min="101"
                step="1"
                value={draft.superPercent}
                onChange={(event) => update({ superPercent: event.target.value })}
              />
            </label>
            <label className={styles.field}>
              <span className={styles.label}>Meta black (% da meta)</span>
              <input
                className={styles.input}
                type="number"
                min="102"
                step="1"
                value={draft.blackPercent}
                onChange={(event) => update({ blackPercent: event.target.value })}
              />
            </label>
          </div>
          <dl className={styles.facts} aria-label="Resumo da meta do setor">
            <div className={styles.fact}>
              <dt>Renovação</dt>
              <dd>{formatCurrency(parts.farm)}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Vendas ({(100 - (Number(draft.farmPercent) || 0)).toLocaleString("pt-BR")}%)</dt>
              <dd>{formatCurrency(parts.sales)}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Super meta</dt>
              <dd>{formatCurrency(tiers.super)}</dd>
            </div>
            <div className={styles.fact}>
              <dt>Meta black</dt>
              <dd>{formatCurrency(tiers.black)}</dd>
            </div>
          </dl>
          {!computed.percentsOk && (
            <p className={styles.error}>
              Renovação vai de 0 a 100%, a Super meta precisa passar de 100% e a Meta black precisa ser maior que a
              Super.
            </p>
          )}
        </div>
      </section>

      <section className="widget" aria-label="Níveis de senioridade">
        <header className="header">
          <h2 className="title">Níveis de senioridade</h2>
        </header>
        <div className={styles.body}>
          <p className={styles.hint}>
            A parte de renovação e a de vendas são divididas pelos pesos: um nível com peso 2 recebe o dobro de um com
            peso 1.
          </p>
          <ul className={styles.levels}>
            {draft.levels.map((level, index) => (
              <li key={level.key} className={styles.levelRow}>
                <label className={styles.field}>
                  <span className={styles.label}>Nível {index + 1}</span>
                  <input
                    className={styles.input}
                    value={level.name}
                    aria-label={`Nome do nível ${index + 1}`}
                    onChange={(event) => updateLevel(level.key, { name: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Peso</span>
                  <input
                    className={`${styles.input} ${styles.small}`}
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={level.weight}
                    aria-label={`Peso do nível ${level.name || index + 1}`}
                    onChange={(event) => updateLevel(level.key, { weight: event.target.value })}
                  />
                </label>
                <button
                  className={styles.dangerButton}
                  type="button"
                  disabled={draft.levels.length === 1}
                  onClick={() => removeLevel(level.key)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
          <button className={styles.secondaryButton} type="button" onClick={addLevel}>
            Adicionar nível
          </button>
          {!computed.levelsOk && (
            <p className={styles.error}>Cada nível precisa de um nome e de um peso maior que zero.</p>
          )}
        </div>
      </section>

      <section className="widget" aria-label="Metas por vendedor">
        <header className="header">
          <h2 className="title">Metas por vendedor</h2>
          <button className={styles.secondaryButton} type="button" onClick={redistribute}>
            Redistribuir pelos pesos
          </button>
        </header>
        <div className={styles.body}>
          <ul className={styles.totals} aria-label="Distribuição">
            {["farm", "sales"].map((type) => (
              <li key={type} className={computed.partsOk[type] ? styles.ok : styles.missing}>
                {TYPE_LABELS[type]}: distribuído {formatCurrency(computed.distributed[type])} de{" "}
                {formatCurrency(computed.parts[type])}
              </li>
            ))}
          </ul>
          {draft.people.length === 0 ? (
            <p className={styles.empty}>Nenhum vendedor com cargo {label}</p>
          ) : (
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Vendedor</th>
                    <th scope="col">Conta</th>
                    <th scope="col">Nível</th>
                    <th scope="col">Meta do mês</th>
                    {weeks.map((week) => (
                      <th key={week.start} scope="col">
                        Sem. {week.index + 1}
                        <span className={styles.weekDays}>
                          {formatShortDay(week.start)} a {formatShortDay(week.end)}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {computed.people.map((person) => (
                    <tr key={person.vendorId} className={person.included ? undefined : styles.excluded}>
                      <th scope="row">
                        <span className={styles.person}>
                          <input
                            type="checkbox"
                            checked={person.included}
                            aria-label={`${person.name} tem meta`}
                            onChange={(event) => updatePerson(person.vendorId, { included: event.target.checked })}
                          />
                          <Avatar name={person.name} imageUrl={person.imageUrl} size="small" />
                          <span>
                            <span className={styles.name}>{person.name}</span>
                            <span className={styles.job}>
                              {[person.job, person.teamName].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </span>
                      </th>
                      <td>{TYPE_LABELS[person.type]}</td>
                      <td>
                        <select
                          className={styles.input}
                          value={person.level}
                          disabled={!person.included}
                          aria-label={`Nível de ${person.name}`}
                          onChange={(event) =>
                            updatePerson(person.vendorId, { level: event.target.value, manualWeeks: null })
                          }
                        >
                          {draft.levels.map((level) => (
                            <option key={level.key} value={level.key}>
                              {level.name || "Sem nome"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {person.included ? (
                          <span className={styles.goalCell}>
                            <input
                              className={`${styles.input} ${styles.money}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={person.manualGoal ?? person.goal}
                              aria-label={`Meta do mês de ${person.name}`}
                              onChange={(event) =>
                                updatePerson(person.vendorId, { manualGoal: event.target.value, manualWeeks: null })
                              }
                            />
                            {person.manualGoal !== null && (
                              <button
                                className={styles.linkButton}
                                type="button"
                                onClick={() => updatePerson(person.vendorId, { manualGoal: null, manualWeeks: null })}
                              >
                                Voltar ao peso
                              </button>
                            )}
                          </span>
                        ) : (
                          <span className={styles.muted}>Sem meta</span>
                        )}
                      </td>
                      {weeks.map((week, index) => (
                        <td key={week.start}>
                          {person.included && (
                            <input
                              className={`${styles.input} ${styles.money} ${person.weeksOk ? "" : styles.invalid}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={person.weeks[index]}
                              aria-label={`Semana ${index + 1} de ${person.name}`}
                              onChange={(event) => changeWeek(person, index, event.target.value)}
                            />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {computed.people.some((person) => !person.weeksOk) && (
            <p className={styles.error}>
              A soma das semanas precisa dar a meta do mês em cada vendedor (campos em vermelho).
            </p>
          )}
        </div>
      </section>

      <div className={styles.actions}>
        <button className={styles.primaryButton} type="submit" disabled={!computed.canSave || save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar metas"}
        </button>
        {!computed.canSave && <p className={styles.hint}>O botão libera quando tudo fecha.</p>}
        {save.isSuccess && <p className={styles.success}>Metas salvas</p>}
        {save.isError && <p className={styles.error}>Não foi possível salvar: {getGoalErrorMessage(save.error)}</p>}
        {draft.source === "saved" &&
          (confirmDelete ? (
            <span className={styles.confirm}>
              Excluir as metas {label} de {formatMonth(month)}?
              <button className={styles.dangerButton} type="button" disabled={remove.isPending} onClick={handleDelete}>
                Excluir
              </button>
              <button className={styles.secondaryButton} type="button" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </button>
            </span>
          ) : (
            <button className={styles.dangerButton} type="button" onClick={() => setConfirmDelete(true)}>
              Excluir metas do mês
            </button>
          ))}
        {remove.isError && (
          <p className={styles.error}>Não foi possível excluir: {getGoalErrorMessage(remove.error)}</p>
        )}
      </div>
    </form>
  );
}
