import styles from "./PrizesWidgets.module.css";

import { useState } from "react";

import usePermissions from "../../../auth/hooks/usePermissions";
import { getPrizeErrorMessage } from "../../api/prizesApi";
import { usePrizeMutations, usePrizes, usePrizeWithdrawals } from "../../hooks/usePrizes";
import Avatar from "../Avatar/Avatar";
import { ChartCard } from "../SalesChartWidgets/SalesChartWidgets";

// Saldo de prêmios (calculado no backend, GET /prizes): a cada 10 pontos das semanas fechadas, 1 prêmio.
// Só o master registra e exclui retiradas; os outros perfis só veem

const ALL = "";
const KIND_OPTIONS = [
  { value: ALL, label: "Todos" },
  { value: "vendor", label: "Vendedores" },
  { value: "sdr", label: "Passagem (SDR, CS, Suporte)" },
];

const formatFullDay = (day) => {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
};

const plural = (amount, one, many) => `${amount} ${Math.abs(amount) === 1 ? one : many}`;
const formatPrizes = (amount) => plural(amount, "prêmio", "prêmios");
const formatPoints = (amount) => plural(amount, "ponto", "pontos");

const balanceText = (person) =>
  person.balance < 0 ? `Devendo ${formatPoints(person.debtPoints)}` : formatPrizes(person.balance);

// Como o saldo fica depois da retirada (para o aviso de "acima do saldo")
const balanceAfter = (person, quantity, step) => {
  const balance = person.balance - quantity;
  const debt = Math.max((person.withdrawn + quantity) * step - person.accumulated, 0);
  return { balance, debt };
};

export function PrizeBalances({ segment }) {
  const { prizes } = usePrizes(segment);
  const { isMaster } = usePermissions();
  const { create } = usePrizeMutations();
  const [teamId, setTeamId] = useState(ALL);
  const [kind, setKind] = useState(ALL);
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [registeringKey, setRegisteringKey] = useState(null);
  const title = "Saldo de prêmios";

  const teamNames = new Map(prizes.teams.map((team) => [String(team.teamId), team.teamName]));
  const people = prizes.people
    .map((person) => ({
      ...person,
      key: `${person.kind}-${person.personId}`,
      teamName: teamNames.get(String(person.teamId)) ?? "Sem equipe",
    }))
    .filter(
      (person) =>
        (teamId === ALL || String(person.teamId) === teamId) &&
        (kind === ALL || person.kind === kind) &&
        (!onlyWithBalance || person.balance > 0),
    );
  const totalBalance = people.reduce((total, person) => total + Math.max(person.balance, 0), 0);

  const csvRows = [
    ["Pessoa", "Equipe", "Cargo", "Pontos acumulados", "Semana em andamento", "Direitos", "Retirados", "Saldo", "Faltam para o próximo"],
    ...people.map((person) => [
      person.name,
      person.teamName,
      person.job ?? "",
      String(person.accumulated),
      String(person.currentWeek),
      String(person.earned),
      String(person.withdrawn),
      String(person.balance),
      String(person.pointsToNext),
    ]),
  ];

  return (
    <ChartCard
      title={title}
      description={`A cada ${prizes.step} pontos acumulados, 1 prêmio. Contam as semanas fechadas até ${formatFullDay(prizes.closedUntil)}; a semana em andamento (${formatFullDay(prizes.currentWeek.start)} a ${formatFullDay(prizes.currentWeek.end)}) ainda não dá direito`}
      csvRows={csvRows}
      segment={segment}
    >
      <div className={styles.toolbar}>
        <label className={styles.field}>
          <span className={styles.label}>Equipe</span>
          <select className={styles.input} value={teamId} onChange={(event) => setTeamId(event.target.value)}>
            <option value={ALL}>Todas</option>
            {prizes.teams.map((team) => (
              <option key={team.teamId} value={String(team.teamId)}>
                {team.teamName}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Tipo</span>
          <select className={styles.input} value={kind} onChange={(event) => setKind(event.target.value)}>
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.check}>
          <input type="checkbox" checked={onlyWithBalance} onChange={(event) => setOnlyWithBalance(event.target.checked)} />
          Só quem tem prêmio para retirar
        </label>
        <p className={styles.summary} aria-label="Prêmios para retirar">
          <strong>{formatPrizes(totalBalance)}</strong> para retirar
        </p>
      </div>

      {create.isSuccess && <p className={styles.success}>Retirada registrada</p>}

      {people.length === 0 ? (
        <p className={styles.empty}>Ninguém nesse filtro</p>
      ) : (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Pessoa</th>
                <th scope="col">Equipe</th>
                <th scope="col" className={styles.number}>Acumulado</th>
                <th scope="col" className={styles.number}>Semana atual</th>
                <th scope="col" className={styles.number}>Direitos</th>
                <th scope="col" className={styles.number}>Retirados</th>
                <th scope="col">Saldo</th>
                <th scope="col">Próximo prêmio</th>
                {isMaster && <th scope="col"><span className={styles.visuallyHidden}>Ações</span></th>}
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <PrizeRow
                  key={person.key}
                  person={person}
                  step={prizes.step}
                  defaultDay={prizes.currentWeek.start}
                  canRegister={isMaster}
                  isRegistering={registeringKey === person.key}
                  onToggle={() => {
                    create.reset();
                    setRegisteringKey(registeringKey === person.key ? null : person.key);
                  }}
                  onDone={() => setRegisteringKey(null)}
                  create={create}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function PrizeRow({ person, step, defaultDay, canRegister, isRegistering, onToggle, onDone, create }) {
  const balanceClass = person.balance < 0 ? styles.debt : person.balance > 0 ? styles.available : styles.zero;

  return (
    <>
      <tr>
        <th scope="row" className={styles.person}>
          <Avatar name={person.name} imageUrl={person.imageUrl} size="small" />
          <span>
            <span className={styles.name}>{person.name}</span>
            {person.job && <span className={styles.job}>{person.job}</span>}
          </span>
        </th>
        <td>{person.teamName}</td>
        <td className={styles.number}>{person.accumulated}</td>
        <td className={styles.number}>{person.currentWeek}</td>
        <td className={styles.number}>{person.earned}</td>
        <td className={styles.number}>{person.withdrawn}</td>
        <td>
          <span className={`${styles.badge} ${balanceClass}`} aria-label={`Saldo de ${person.name}`}>
            {balanceText(person)}
          </span>
        </td>
        <td className={styles.next}>
          {person.pointsToNext === 0 ? "Garantido quando a semana fechar" : `Faltam ${formatPoints(person.pointsToNext)}`}
        </td>
        {canRegister && (
          <td>
            <button className={styles.secondaryButton} type="button" aria-expanded={isRegistering} onClick={onToggle}>
              Registrar retirada
            </button>
          </td>
        )}
      </tr>
      {isRegistering && (
        <tr className={styles.formRow}>
          <td colSpan={9}>
            <WithdrawalForm person={person} step={step} defaultDay={defaultDay} create={create} onDone={onDone} />
          </td>
        </tr>
      )}
    </>
  );
}

function WithdrawalForm({ person, step, defaultDay, create, onDone }) {
  const [quantity, setQuantity] = useState("1");
  const [prize, setPrize] = useState("");
  const [withdrawnAt, setWithdrawnAt] = useState(defaultDay);
  const [formError, setFormError] = useState("");

  const amount = Number(quantity);
  const isOverBalance = Number.isInteger(amount) && amount > person.balance;
  const after = balanceAfter(person, amount, step);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!Number.isInteger(amount) || amount < 1) {
      setFormError("A quantidade precisa ser pelo menos 1");
      return;
    }
    if (!prize.trim()) {
      setFormError("Informe qual prêmio");
      return;
    }
    if (!withdrawnAt) {
      setFormError("Informe o dia da retirada");
      return;
    }

    // Acima do saldo: avisa e só registra com a confirmação
    if (
      isOverBalance &&
      !window.confirm(
        `${person.name} tem saldo de ${formatPrizes(person.balance)}. Registrar ${formatPrizes(amount)} deixa o saldo em ${after.balance} (devendo ${formatPoints(after.debt)}). Registrar mesmo assim?`,
      )
    ) {
      return;
    }

    create.mutate(
      {
        personId: String(person.personId),
        kind: person.kind,
        quantity: amount,
        prize: prize.trim(),
        withdrawnAt,
        ...(isOverBalance ? { confirmOverBalance: true } : {}),
      },
      { onSuccess: onDone },
    );
  };

  const changeAnd = (setter) => (event) => {
    setter(event.target.value);
    setFormError("");
    create.reset();
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label={`Registrar retirada de ${person.name}`}>
      <label className={styles.field}>
        <span className={styles.label}>Quantidade</span>
        <input className={styles.input} type="number" min="1" step="1" value={quantity} onChange={changeAnd(setQuantity)} />
      </label>
      <label className={`${styles.field} ${styles.grow}`}>
        <span className={styles.label}>Prêmio</span>
        <input
          className={styles.input}
          type="text"
          maxLength={100}
          placeholder="Ex.: Fone JBL"
          value={prize}
          onChange={changeAnd(setPrize)}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Dia da retirada</span>
        <input className={styles.input} type="date" value={withdrawnAt} onChange={changeAnd(setWithdrawnAt)} />
      </label>
      <button className={styles.primaryButton} type="submit" disabled={create.isPending}>
        {create.isPending ? "Registrando..." : "Registrar"}
      </button>
      {isOverBalance && (
        <p className={styles.warning} role="status">
          Acima do saldo: {person.name} ficaria devendo {formatPoints(after.debt)}. Vai pedir confirmação.
        </p>
      )}
      {formError && <p className={styles.error}>{formError}</p>}
      {create.isError && <p className={styles.error}>Não foi possível registrar: {getPrizeErrorMessage(create.error)}</p>}
    </form>
  );
}

export function PrizeHistory({ segment }) {
  const { withdrawals } = usePrizeWithdrawals(segment);
  const { isMaster } = usePermissions();
  const { remove } = usePrizeMutations();
  const title = "Retiradas registradas";

  const handleDelete = (withdrawal) => {
    if (
      window.confirm(
        `Excluir a retirada de ${formatPrizes(withdrawal.quantity)} (${withdrawal.prize}) de ${withdrawal.name}? O saldo volta a contar esse prêmio.`,
      )
    ) {
      remove.mutate(withdrawal._id);
    }
  };

  return (
    <ChartCard
      title={title}
      description="Da mais recente para a mais antiga"
      csvRows={[
        ["Dia", "Pessoa", "Cargo", "Quantidade", "Prêmio", "Registrado por"],
        ...withdrawals.map((withdrawal) => [
          formatFullDay(withdrawal.withdrawnAt),
          withdrawal.name,
          withdrawal.job ?? "",
          String(withdrawal.quantity),
          withdrawal.prize,
          withdrawal.createdBy ?? "",
        ]),
      ]}
      segment={segment}
    >
      {remove.isError && <p className={styles.error}>Não foi possível excluir: {getPrizeErrorMessage(remove.error)}</p>}
      {withdrawals.length === 0 ? (
        <p className={styles.empty}>Nenhuma retirada registrada</p>
      ) : (
        <ul className={styles.history} aria-label="Histórico de retiradas">
          {withdrawals.map((withdrawal) => (
            <li key={withdrawal._id} className={styles.historyItem}>
              <span className={styles.historyDay}>{formatFullDay(withdrawal.withdrawnAt)}</span>
              <span className={styles.historyText}>
                <strong>{withdrawal.name}</strong> retirou {formatPrizes(withdrawal.quantity)}: {withdrawal.prize}
              </span>
              {isMaster && (
                <button
                  className={styles.dangerButton}
                  type="button"
                  disabled={remove.isPending}
                  aria-label={`Excluir retirada de ${withdrawal.name} (${withdrawal.prize})`}
                  onClick={() => handleDelete(withdrawal)}
                >
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
