import styles from "./Avatar.module.css";

import { useState } from "react";

const initialsOf = (name) =>
  String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

export default function Avatar({ name, imageUrl, size = "medium" }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = imageUrl && failedUrl !== imageUrl;

  return (
    <span
      className={`${styles.avatar} ${styles[size]}`}
      data-initials={showImage ? undefined : initialsOf(name) || "?"}
      aria-hidden="true"
    >
      {showImage && <img className={styles.image} src={imageUrl} alt="" onError={() => setFailedUrl(imageUrl)} />}
    </span>
  );
}
