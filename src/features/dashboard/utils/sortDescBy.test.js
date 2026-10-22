import { describe, expect, it } from "vitest";

import { sortDescBy } from "./sortDescBy";

describe("sortDescBy", () => {
  it("ordena do maior para o menor pelo campo informado", () => {
    const sortByPoints = sortDescBy("points");

    expect(sortByPoints([{ points: 3 }, { points: 9 }, { points: 5 }])).toEqual([
      { points: 9 },
      { points: 5 },
      { points: 3 },
    ]);
  });

  it("não altera o array original", () => {
    const items = [{ total: 1 }, { total: 2 }];

    sortDescBy("total")(items);

    expect(items).toEqual([{ total: 1 }, { total: 2 }]);
  });
});
