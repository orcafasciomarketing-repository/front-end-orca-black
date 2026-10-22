import styles from "./SalePopup.module.css";

import { useEffect, useRef, useState } from "react";

export const SALE_BILLBOARD_DURATION = 10 * 1000;

const HEADLINES = {
  sales: "+1 Venda",
  farm: "+1 Renovação",
};

export default function SalePopup({ item, videoUrl, onFinish }) {
  const [displayedItem, setDisplayedItem] = useState(item);

  if (item && item !== displayedItem) {
    setDisplayedItem(item);
  }

  const visible = Boolean(item);

  return (
    <section
      className={`${styles.popup} ${visible ? styles.visible : ""}`}
      aria-hidden={!visible}
      data-testid="sale-popup"
    >
      {displayedItem && (
        <SaleSequence
          key={displayedItem.key}
          sale={displayedItem.sale}
          videoUrl={videoUrl}
          active={visible}
          onFinish={onFinish}
        />
      )}
    </section>
  );
}

function SaleSequence({ sale, videoUrl, active, onFinish }) {
  const [stage, setStage] = useState(videoUrl ? "video" : "billboard");
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    if (!active || stage !== "billboard") {
      return;
    }

    const timeoutId = setTimeout(() => onFinishRef.current(), SALE_BILLBOARD_DURATION);

    return () => clearTimeout(timeoutId);
  }, [active, stage]);

  if (stage === "video") {
    return (
      <video
        className={styles.video}
        src={videoUrl}
        autoPlay
        muted
        playsInline
        onEnded={() => setStage("billboard")}
        onError={() => setStage("billboard")}
        data-testid="sale-video"
      />
    );
  }

  return <SaleBillboard sale={sale} />;
}

function SaleBillboard({ sale }) {
  const { seller, assist } = sale;

  return (
    <div className={styles.billboardStage}>
      <img className={styles.logo} src="/orca-black-logo.png" alt="Orça Black" />
      <div className={styles.billboard}>
        <div className={styles.info}>
          <p className={styles.person}>
            <strong className={styles.sellerName}>{seller.name}</strong>
            {seller.job && <span className={styles.job}>({seller.job})</span>}
          </p>
          <p className={styles.headline}>{HEADLINES[sale.type] ?? HEADLINES.sales}</p>
          {assist && (
            <div className={styles.assist}>
              {assist.imageUrl ? (
                <img className={styles.avatar} src={assist.imageUrl} alt={assist.name} />
              ) : (
                <span className={styles.avatar} />
              )}
              <div>
                <span className={styles.assistLabel}>Assistência</span>
                <p className={styles.person}>
                  <strong className={styles.assistName}>{assist.name}</strong>
                  {assist.job && <span className={styles.job}>({assist.job})</span>}
                </p>
              </div>
            </div>
          )}
        </div>
        {seller.imageUrl && <img className={styles.photo} src={seller.imageUrl} alt={seller.name} />}
      </div>
    </div>
  );
}
