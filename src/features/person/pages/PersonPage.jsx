import styles from "./PersonPage.module.css";

import { Suspense, useState } from "react";

import ErrorBoundary from "../../../shared/components/ErrorBoundary/ErrorBoundary";
import { formatCurrency } from "../../../shared/utils/formatCurrency";
import Avatar from "../../admin/components/Avatar/Avatar";
import PageHeader from "../../admin/components/PageHeader/PageHeader";
import { PeopleList } from "../../admin/components/PeoplePoints/PeoplePoints";
import RankPeriodTabs from "../../admin/components/RankPeriodTabs/RankPeriodTabs";
import { SaleList } from "../../admin/components/SaleWidget/SaleWidget";
import WidgetFallback from "../../admin/components/WidgetFallback/WidgetFallback";
import { useMe, useMyPrizes, useMySales, useMyTeam } from "../hooks/useMe";
import { summarizeMySales } from "../utils/mySales";

const formatPoints = (value) => `${value} ${value === 1 ? "ponto" : "pontos"}`;

const SALES_TITLE = { vendor: "Minhas vendas", sdr: "Vendas com a minha passagem" };

export default function PersonPage() {
  return (
    <div className={styles.page}>
      <ErrorBoundary location="Minha área">
        <Suspense fallback={<WidgetFallback title="Minha área" />}>
          <PersonArea />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function PersonArea() {
  const { me } = useMe();
  const [period, setPeriod] = useState("all");
  const salesTitle = SALES_TITLE[me.kind] ?? SALES_TITLE.vendor;
  const details = [me.job, me.team?.teamName].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader title={`Olá, ${me.name}`} description={details} />
      <ErrorBoundary location="Minha área › resumo">
        <Suspense fallback={<WidgetFallback title="Resumo" />}>
          <MySummary title={salesTitle} />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary location="Minha área › prêmios">
        <Suspense fallback={<WidgetFallback title="Meus pontos e prêmios" />}>
          <MyPrizes />
        </Suspense>
      </ErrorBoundary>
      <div className={styles.grid}>
        <section className="widget" aria-label="Ranking dos times">
          <header className="header">
            <h2 className="title">Ranking dos times</h2>
          </header>
          <RankPeriodTabs value={period} onChange={setPeriod} label="Período dos pontos" />
          <ErrorBoundary key={`teams-${period}`} location="Minha área › ranking dos times">
            <Suspense fallback={<p className={styles.empty}>Carregando ranking...</p>}>
              <TeamsRanking period={period} />
            </Suspense>
          </ErrorBoundary>
        </section>
        <section className="widget" aria-label="Pontos do meu time">
          <header className="header">
            <h2 className="title">Pontos do meu time</h2>
          </header>
          <ErrorBoundary key={`people-${period}`} location="Minha área › pontos do time">
            <Suspense fallback={<p className={styles.empty}>Carregando pontos...</p>}>
              <TeamPeople period={period} />
            </Suspense>
          </ErrorBoundary>
        </section>
      </div>
      <ErrorBoundary location="Minha área › vendas">
        <Suspense fallback={<WidgetFallback title={salesTitle} />}>
          <MySalesList title={salesTitle} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}

function MySummary({ title }) {
  const { sales } = useMySales();
  const summary = summarizeMySales(sales);
  const tiles = [
    { label: "Total vendido", value: formatCurrency(summary.total) },
    { label: "Vendas concluídas", value: String(summary.count) },
    { label: "Ticket médio", value: formatCurrency(summary.average) },
    { label: "Canceladas", value: String(summary.cancelled) },
  ];

  return (
    <dl className={styles.tiles} aria-label={`Resumo: ${title}`}>
      {tiles.map((tile) => (
        <div key={tile.label} className={`widget ${styles.tile}`}>
          <dt className={styles.tileLabel}>{tile.label}</dt>
          <dd className={styles.tileValue}>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MyPrizes() {
  const { prizes } = useMyPrizes();
  const tiles = [
    { label: "Meus pontos", value: String(prizes.accumulated) },
    { label: "Prêmios retirados", value: String(prizes.withdrawn) },
  ];

  return (
    <dl className={styles.prizeTiles} aria-label="Meus pontos e prêmios">
      {tiles.map((tile) => (
        <div key={tile.label} className={`widget ${styles.tile}`}>
          <dt className={styles.tileLabel}>{tile.label}</dt>
          <dd className={styles.tileValue}>{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TeamsRanking({ period }) {
  const { team } = useMyTeam(period);
  const myTeamId = team.team ? String(team.team.teamId) : null;

  return (
    <div className={styles.body}>
      {team.team && (
        <p className={styles.highlight}>
          Seu time está em <strong>{team.team.position}º lugar</strong>, com {formatPoints(team.team.total)}
        </p>
      )}
      <ol className={styles.teams} aria-label="Times">
        {team.teams.map((item) => {
          const isMine = String(item.teamId) === myTeamId;
          return (
            <li key={String(item.teamId)} className={`${styles.teamRow} ${isMine ? styles.mine : ""}`}>
              <span className={`${styles.position} ${styles[`position${item.position}`] ?? ""}`}>{item.position}º</span>
              <Avatar name={item.teamName} imageUrl={item.teamShirt} size="small" />
              <span className={styles.teamName}>
                {item.teamName}
                {isMine && <span className={styles.mineTag}> (seu time)</span>}
              </span>
              <strong className={styles.points}>{formatPoints(item.total)}</strong>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TeamPeople({ period }) {
  const { team } = useMyTeam(period);
  const people = team.people.map((person) => ({
    ...person,
    key: `${person.kind}-${person.personId}`,
    teamName: "",
  }));

  return (
    <div className={styles.body}>
      <PeopleList people={people} label="Pontos do meu time" />
    </div>
  );
}

function MySalesList({ title }) {
  const { sales, total } = useMySales();

  return <SaleList sales={sales} total={total} title={title} />;
}
