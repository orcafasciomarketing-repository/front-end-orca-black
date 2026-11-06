import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Avatar from "./Avatar";

describe("Avatar", () => {
  it("com foto mostra a imagem, sem texto", () => {
    const { container } = render(<Avatar name="Gustavo Rocha" imageUrl="http://foto/gustavo.png" />);

    expect(container.querySelector("img")).toHaveAttribute("src", "http://foto/gustavo.png");
    expect(container.firstChild).not.toHaveAttribute("data-initials");
    expect(container.textContent).toBe("");
  });

  it("sem foto, ou se a foto não carrega, mostra as iniciais pelo CSS", () => {
    const { container, rerender } = render(<Avatar name="Gustavo Rocha" />);
    expect(container.firstChild).toHaveAttribute("data-initials", "GR");
    expect(container.textContent).toBe("");

    rerender(<Avatar name="Caio" imageUrl="http://foto/quebrada.png" />);
    fireEvent.error(container.querySelector("img"));
    expect(container.firstChild).toHaveAttribute("data-initials", "C");
    expect(container.querySelector("img")).toBeNull();
  });

  it("sem nome mostra ?", () => {
    const { container } = render(<Avatar name="" />);

    expect(container.firstChild).toHaveAttribute("data-initials", "?");
  });
});
