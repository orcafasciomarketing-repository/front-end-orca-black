import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { parseMoney } from "../../utils/goalMath";
import MoneyInput from "./MoneyInput";

const text = (element) => element.value.replace(/ /g, " ");

function Harness({ initial, onValue = () => {} }) {
  const [value, setValue] = useState(initial);
  return (
    <MoneyInput
      label="Valor"
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue(next);
      }}
    />
  );
}

describe("MoneyInput", () => {
  it("fora da edição mostra o valor em R$; ao focar mostra o número para editar", () => {
    render(<Harness initial={284083.2} />);
    const input = screen.getByLabelText("Valor");

    expect(text(input)).toBe("R$ 284.083,20");
    fireEvent.focus(input);
    expect(input.value).toBe("284083,2");
    fireEvent.blur(input);
    expect(text(input)).toBe("R$ 284.083,20");
  });

  it("aceita vírgula ou ponto como decimal e devolve número", () => {
    const onValue = vi.fn();
    render(<Harness initial="" onValue={onValue} />);
    const input = screen.getByLabelText("Valor");

    expect(input.value).toBe("");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "1.500,5" } });
    expect(onValue).toHaveBeenLastCalledWith(1500.5);
    expect(input.value).toBe("1.500,5");

    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);
    expect(text(input)).toBe("R$ 1.500,50");
  });

  it("parseMoney", () => {
    expect(parseMoney("R$ 2.000,00")).toBe(2000);
    expect(parseMoney("2500.75")).toBe(2500.75);
    expect(parseMoney("")).toBe("");
    expect(parseMoney("abc")).toBe("");
  });
});
