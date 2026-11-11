import styles from "./GoalSetupForm.module.css";

import { useState } from "react";

import { formatCurrency } from "../../../../shared/utils/formatCurrency";
import Avatar from "../../../admin/components/Avatar/Avatar";
import { getGoalErrorMessage } from "../../api/goalsApi";
import MoneyInput from "../MoneyInput/MoneyInput";
import { buildDraft, computeDraft, levelsOfType, newLevel, toPayload } from "../../utils/goalDraft";
import { formatMonth, GOAL_TYPES, TIER_LABELS, toCents } from "../../utils/goalMath";

const SOURCE_NOTES = {
  previous: (month) =>
    `Mês sem metas: os níveis, os tickets e o nível de cada vendedor vieram de ${formatMonth(month)}. Revise e salve.`,
  new: () => "Mês sem metas. Preencha a Meta e a Super de cada nível, escolha o nível de cada vendedor e salve.",
};

const TYPE_NAMES = { farm: "Farmer", sales: "Venda" };

const PROBLEM_TEXT = {
  name: "dê um nome",
  goal: "preencha a Meta",
  super: "a Super precisa ser igual ou maior que a Meta",
  black: "a Meta black precisa ser igual ou maior que a Super",
};

const SEGMENTS_WITH_TICKETS = ["b2b"];

const NO_TICKETS = { farm: null, sales: null };

const salesNeeded = (value, ticket) =>
  Number(ticket) > 0 && Number(value) > 0 ? Math.ceil(toCents(value) / toCents(ticket)) : null;

const leadsNeeded = (value, ticket, conversion) =>
  Number(ticket) > 0 && Number(conversion) > 0 && Number(value) > 0
    ? Math.ceil(toCents(value) / ((toCents(ticket) * Number(conversion)) / 100))
    : null;

export default function GoalSetupForm({ month, segment, segmentData, black: monthBlack, save, remove }) {
  const black = { active: monthBlack.active, sectorGoal: monthBlack.sectorGoals?.[segment] ?? 0 };
  const [draft, setDraft] = useState(() => buildDraft(segmentData, black));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const computed = computeDraft(draft, black);
  const label = segment.toUpperCase();
  const tierKeys = black.active ? ["goal", "super", "black"] : ["goal", "super"];
  const usesTickets = SEGMENTS_WITH_TICKETS.includes(segment);

  const update = (changes) => {
    save.reset();
    setDraft((current) => ({ ...current, ...changes }));
  };

  const updatePerson = (vendorId, changes) =>
    update({
      people: draft.people.map((person) => (person.vendorId === vendorId ? { ...person, ...changes } : person)),
    });

  const updateLevel = (type, key, changes) =>
    update({
      levels: draft.levels.map((level) =>
        level.type === type && level.key === key ? { ...level, ...changes } : level,
      ),
    });

  const addLevel = (type) => update({ levels: [...draft.levels, newLevel(draft.levels, type)] });

  const removeLevel = (type, key) => {
    const levels = draft.levels.filter((level) => !(level.type === type && level.key === key));
    const fallback = levelsOfType(levels, type)[0]?.key ?? "";
    update({
      levels,
      people: draft.people.map((person) =>
        person.type === type && person.level === key ? { ...person, level: fallback } : person,
      ),
    });
  };

  const backToLevels = () =>
    update({
      people: draft.people.map((person) => ({ ...person, manualGoal: null, manualSuper: null, manualBlack: null })),
    });

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!computed.canSave) return;
    const payload = toPayload(draft, computed, black);
    save.mutate({
      month,
      segment,
      payload: usesTickets ? payload : { ...payload, tickets: NO_TICKETS, conversion: NO_TICKETS },
    });
  };

  const handleDelete = () => {
    remove.mutate({ month, segment }, { onSuccess: () => setConfirmDelete(false) });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label={`Metas ${label} de ${formatMonth(month)}`}>
      {draft.source !== "saved" && <p className={styles.notice}>{SOURCE_NOTES[draft.source](draft.sourceMonth)}</p>}
      {draft.legacy && (
        <p className={styles.notice}>
          Este mês foi salvo no modelo antigo (pesos e % da Super). Os níveis abaixo vieram das metas salvas de cada
          vendedor; ao salvar, o mês passa para o modelo novo, com as mesmas metas.
        </p>
      )}

      <section className="widget" aria-label={`Meta do setor ${label}`}>
        <header className="header">
          <h2 className="title">Meta do setor {label}</h2>
        </header>
        <div className={styles.body}>
          <p className={styles.hint}>
            A meta do setor é a soma das metas dos vendedores, que vêm do nível de cada um. A meta da semana é calculada
            sozinha: no começo de cada semana, o que falta para o mês ÷ as semanas que faltam.
          </p>
          <div className={styles.scroll}>
            <table className={styles.table} aria-label="Divisão das metas do setor">
              <thead>
                <tr>
                  <th scope="col">Faixa</th>
                  <th scope="col" className={styles.number}>
                    Farmer
                  </th>
                  <th scope="col" className={styles.number}>
                    Venda
                  </th>
                  <th scope="col" className={styles.number}>
                    Setor
                  </th>
                </tr>
              </thead>
              <tbody>
                {tierKeys.map((tier) => (
                  <tr key={tier}>
                    <th scope="row">{TIER_LABELS[tier]}</th>
                    <td className={styles.number}>{formatCurrency(computed.byType.farm[tier])}</td>
                    <td className={styles.number}>{formatCurrency(computed.byType.sales[tier])}</td>
                    <td className={styles.number}>{formatCurrency(computed.tiers[tier])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {usesTickets && (
            <>
              <div className={styles.fields}>
                {GOAL_TYPES.map((type) => (
                  <MoneyField
                    key={type}
                    label={`Ticket médio ${TYPE_NAMES[type]} (R$)`}
                    value={draft.tickets[type]}
                    onChange={(value) => update({ tickets: { ...draft.tickets, [type]: value } })}
                  />
                ))}
              </div>
              <div className={styles.fields}>
                {GOAL_TYPES.map((type) => (
                  <label key={type} className={styles.field}>
                    <span className={styles.label}>Conversão de leads {TYPE_NAMES[type]} (%)</span>
                    <input
                      className={styles.input}
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={draft.conversion[type]}
                      aria-invalid={!computed.conversionOk[type] || undefined}
                      onChange={(event) => update({ conversion: { ...draft.conversion, [type]: event.target.value } })}
                    />
                  </label>
                ))}
              </div>
              <p className={styles.hint}>
                O ticket médio mostra quantas vendas faltam para a meta (o que falta ÷ ticket) e, com a conversão,
                quantos leads faltam (o que falta ÷ (ticket × conversão)). Vazio, não mostra.
              </p>
              {GOAL_TYPES.filter((type) => !computed.conversionOk[type]).map((type) => (
                <p key={type} className={styles.error}>
                  A conversão de {TYPE_NAMES[type]} precisa ser maior que 0 e no máximo 100%.
                </p>
              ))}
            </>
          )}
          {black.active && (
            <>
              <div className={styles.fields}>
                {GOAL_TYPES.map((type) => (
                  <ReadOnlyField
                    key={type}
                    label={`Meta black ${TYPE_NAMES[type]} (soma)`}
                    value={formatCurrency(computed.byType[type].black)}
                  />
                ))}
                <ReadOnlyField label={`Meta black do ${label} (soma)`} value={formatCurrency(computed.tiers.black)} />
              </div>
              <p className={styles.hint}>
                Mês da campanha com Meta black: a Meta black de cada nível fica nas tabelas de níveis, e a de Farmer, a
                de Venda e a do setor são a soma dos vendedores. Cada uma pode ser igual à Super meta, mas não menor.
                {black.sectorGoal > 0 &&
                  ` Para referência, a meta do ${label} na campanha é ${formatCurrency(black.sectorGoal)}.`}
              </p>
              {GOAL_TYPES.filter((type) => !computed.blackOk[type]).map((type) => (
                <p key={type} className={styles.error}>
                  {computed.blackFilled[type]
                    ? `${TYPE_NAMES[type]}: a Meta black não pode ser menor que a Super meta (${formatCurrency(computed.byType[type].super)}).`
                    : `Informe a Meta black de cada nível de ${TYPE_NAMES[type]}.`}
                </p>
              ))}
            </>
          )}
        </div>
      </section>

      {GOAL_TYPES.map((type) => (
        <LevelsTable
          key={type}
          type={type}
          levels={computed.levels.filter((level) => level.type === type)}
          ticket={usesTickets ? draft.tickets[type] : null}
          conversion={usesTickets ? draft.conversion[type] : null}
          showNeeded={usesTickets}
          showBlack={black.active}
          onChange={(key, changes) => updateLevel(type, key, changes)}
          onAdd={() => addLevel(type)}
          onRemove={(key) => removeLevel(type, key)}
        />
      ))}

      <section className="widget" aria-label="Metas por vendedor">
        <header className="header">
          <h2 className="title">Metas por vendedor</h2>
          <button className={styles.secondaryButton} type="button" onClick={backToLevels}>
            Voltar todos ao nível
          </button>
        </header>
        <div className={styles.body}>
          <p className={styles.hint}>
            A Meta e a Super de cada vendedor vêm do nível dele e podem ser ajustadas à mão.
            {black.active && " A Meta black também vem do nível e pode ser ajustada à mão."}
          </p>
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
                    <th scope="col" className={styles.number}>
                      Meta do mês
                    </th>
                    <th scope="col" className={styles.number}>
                      Super meta
                    </th>
                    {black.active && (
                      <th scope="col" className={styles.number}>
                        Meta black
                      </th>
                    )}
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
                      <td>{TYPE_NAMES[person.type]}</td>
                      <td>
                        <select
                          className={styles.input}
                          value={person.level}
                          disabled={!person.included}
                          aria-label={`Nível de ${person.name}`}
                          aria-invalid={!person.levelOk || undefined}
                          onChange={(event) => updatePerson(person.vendorId, { level: event.target.value })}
                        >
                          {!person.levelOk && <option value={person.level}>Escolha</option>}
                          {levelsOfType(draft.levels, person.type).map((level) => (
                            <option key={level.key} value={level.key}>
                              {level.name || "Sem nome"}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {person.included ? (
                          <TierInput
                            label={`Meta do mês de ${person.name}`}
                            value={person.manualGoal ?? person.tiers.goal}
                            manual={person.manualGoal !== null}
                            resetText="Voltar ao nível"
                            onChange={(manualGoal) => updatePerson(person.vendorId, { manualGoal })}
                          />
                        ) : (
                          <span className={styles.muted}>Sem meta</span>
                        )}
                      </td>
                      <td>
                        {person.included && (
                          <TierInput
                            label={`Super meta de ${person.name}`}
                            value={person.manualSuper ?? person.tiers.super}
                            manual={person.manualSuper !== null}
                            invalid={!person.superOk}
                            resetText="Voltar ao nível"
                            onChange={(manualSuper) => updatePerson(person.vendorId, { manualSuper })}
                          />
                        )}
                      </td>
                      {black.active && (
                        <td>
                          {person.included && (
                            <TierInput
                              label={`Meta black de ${person.name}`}
                              value={person.manualBlack ?? person.tiers.black}
                              manual={person.manualBlack !== null}
                              invalid={!person.blackOk}
                              resetText="Voltar ao nível"
                              onChange={(manualBlack) => updatePerson(person.vendorId, { manualBlack })}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {computed.people.some((person) => !person.levelOk) && (
            <p className={styles.error}>Escolha um nível para cada vendedor com meta.</p>
          )}
          {computed.people.some((person) => !person.superOk) && (
            <p className={styles.error}>A Super meta de cada vendedor não pode ser menor que a Meta do mês dele.</p>
          )}
          {computed.people.some((person) => !person.blackOk) && (
            <p className={styles.error}>A Meta black de cada vendedor não pode ser menor que a Super meta dele.</p>
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

function LevelsTable({ type, levels, ticket, conversion, showNeeded, showBlack, onChange, onAdd, onRemove }) {
  const title = `Níveis · ${TYPE_NAMES[type]}`;

  return (
    <section className="widget" aria-label={title}>
      <header className="header">
        <h2 className="title">{title}</h2>
        <button className={styles.secondaryButton} type="button" onClick={onAdd}>
          Adicionar nível
        </button>
      </header>
      <div className={styles.body}>
        <p className={styles.hint}>
          {showBlack ? "Meta, Super e Meta black" : "Meta e Super"} em R$ de cada nível; o vendedor recebe as do nível
          dele.
        </p>
        <div className={styles.scroll}>
          <table className={styles.table} aria-label={title}>
            <thead>
              <tr>
                <th scope="col">Nível</th>
                <th scope="col" className={styles.number}>
                  Meta
                </th>
                <th scope="col" className={styles.number}>
                  Super meta
                </th>
                {showBlack && (
                  <th scope="col" className={styles.number}>
                    Meta black
                  </th>
                )}
                {showNeeded && (
                  <>
                    <th scope="col" className={styles.number}>
                      Vendas necessárias
                    </th>
                    <th scope="col" className={styles.number}>
                      Leads necessários
                    </th>
                  </>
                )}
                <th scope="col">
                  <span className={styles.srOnly}>Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {levels.map((level, index) => {
                const name = level.name || `Nível ${index + 1}`;
                const needed = salesNeeded(level.goal, ticket);
                const leads = leadsNeeded(level.goal, ticket, conversion);
                return (
                  <tr key={level.key}>
                    <th scope="row">
                      <input
                        className={styles.input}
                        value={level.name}
                        aria-label={`Nome do nível ${index + 1} de ${TYPE_NAMES[type]}`}
                        aria-invalid={level.problems.includes("name") || undefined}
                        onChange={(event) => onChange(level.key, { name: event.target.value })}
                      />
                    </th>
                    <td>
                      <MoneyInput
                        plain
                        className={styles.money}
                        invalid={level.problems.includes("goal")}
                        value={level.goal}
                        label={`Meta do nível ${name} de ${TYPE_NAMES[type]}`}
                        onChange={(goal) => onChange(level.key, { goal })}
                      />
                    </td>
                    <td>
                      <MoneyInput
                        plain
                        className={styles.money}
                        invalid={level.problems.includes("super")}
                        value={level.superGoal}
                        label={`Super meta do nível ${name} de ${TYPE_NAMES[type]}`}
                        onChange={(superGoal) => onChange(level.key, { superGoal })}
                      />
                    </td>
                    {showBlack && (
                      <td>
                        <MoneyInput
                          plain
                          className={styles.money}
                          invalid={level.problems.includes("black")}
                          value={level.blackGoal}
                          label={`Meta black do nível ${name} de ${TYPE_NAMES[type]}`}
                          onChange={(blackGoal) => onChange(level.key, { blackGoal })}
                        />
                      </td>
                    )}
                    {showNeeded && (
                      <>
                        <td className={styles.number}>{needed ?? "—"}</td>
                        <td className={styles.number}>{leads ?? "—"}</td>
                      </>
                    )}
                    <td>
                      <button
                        className={styles.dangerButton}
                        type="button"
                        disabled={levels.length === 1}
                        aria-label={`Remover o nível ${name} de ${TYPE_NAMES[type]}`}
                        onClick={() => onRemove(level.key)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {levels.map(
          (level, index) =>
            level.problems.length > 0 && (
              <p key={level.key} className={styles.error}>
                {level.name.trim() || `Nível ${index + 1}`}:{" "}
                {level.problems.map((problem) => PROBLEM_TEXT[problem]).join("; ")}.
              </p>
            ),
        )}
      </div>
    </section>
  );
}

function MoneyField({ label, value, onChange }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <MoneyInput value={value} onChange={onChange} />
    </label>
  );
}

function TierInput({ label, value, manual, invalid = false, resetText, onChange }) {
  return (
    <span className={styles.goalCell}>
      <MoneyInput plain className={styles.money} invalid={invalid} value={value} label={label} onChange={onChange} />
      {manual && (
        <button className={styles.linkButton} type="button" onClick={() => onChange(null)}>
          {resetText}
        </button>
      )}
    </span>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <output className={styles.readonly} aria-label={label}>
        {value}
      </output>
    </div>
  );
}
