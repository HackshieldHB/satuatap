import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Masuk</Button>);
    expect(screen.getByRole("button", { name: "Masuk" })).toBeInTheDocument();
  });

  it("shows the success state and disables itself", () => {
    render(<Button isSuccess>Masuk</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent("Berhasil");
  });

  it("is disabled while loading", () => {
    render(<Button isLoading>Masuk</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
