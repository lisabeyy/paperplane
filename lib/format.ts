/** Display-only number formatting. Internal math stays raw. */

const SUB = "₀₁₂₃₄₅₆₇₈₉";

export type NumKind = "fiat" | "percent" | "ratio" | "price" | "token";

export function invalid(n: unknown): n is null | undefined {
  return typeof n !== "number" || !Number.isFinite(n);
}

function sub(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUB[Number(d)] ?? d)
    .join("");
}

function group(int: string): string {
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function trimZeros(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

export function formatFiat(n: unknown, context: "compact" | "detailed" = "detailed", signed = false): string {
  if (invalid(n)) return "--";
  const v = n as number;
  if (Object.is(v, -0) || v === 0) return "$0.00";
  const sign = v < 0 ? "-" : signed ? "+" : "";
  const a = Math.abs(v);
  if (a < 0.005) return `${v < 0 ? "-" : signed ? "+" : ""}<$0.01`;
  if (context === "compact" && a >= 1000) {
    const units: [number, string][] = [
      [1e12, "T"],
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"],
    ];
    for (const [div, suf] of units) {
      if (a >= div) {
        const x = a / div;
        const body = trimZeros(x.toFixed(1));
        return `${sign}$${body}${suf}`;
      }
    }
  }
  return `${sign}$${group(a.toFixed(2))}`;
}

export function formatPercent(n: unknown, signed = false): string {
  if (invalid(n)) return "--";
  const v = n as number;
  if (v === 0 || Object.is(v, -0)) return "0.00%";
  const sign = v < 0 ? "-" : signed ? "+" : "";
  const a = Math.abs(v);
  if (a < 0.005) return `${v < 0 ? "-" : signed ? "+" : ""}<0.01%`;
  if (a >= 1000) return `${sign}${group(a.toFixed(0))}%`;
  if (a >= 100) return `${sign}${a.toFixed(1)}%`;
  return `${sign}${a.toFixed(2)}%`;
}

export function formatRatio(n: unknown): string {
  if (invalid(n)) return "--";
  const v = n as number;
  if (v === 0) return "0x";
  const a = Math.abs(v);
  if (a < 0.005) return "<0.01x";
  const body = trimZeros(a.toFixed(2));
  const [i, d] = body.split(".");
  return `${group(i!)}${d ? "." + d : ""}x`;
}

/** Token price. Never abbreviated. */
export function formatPrice(n: unknown, context: "compact" | "detailed" = "detailed"): string {
  if (invalid(n)) return "--";
  const v = n as number;
  if (v === 0) return "$0.00";
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a >= 1000) return `${sign}$${group(a.toFixed(2))}`;
  if (a >= 100) return context === "compact" ? `${sign}$${group(Math.round(a).toFixed(0))}` : `${sign}$${group(a.toFixed(2))}`;
  if (a >= 1) {
    if (context === "compact") {
      const s = a.toPrecision(3);
      return `${sign}$${trimZeros(Number(s).toFixed(6).replace(/0+$/, "").replace(/\.$/, ""))}`;
    }
    return `${sign}$${trimZeros(a.toPrecision(5))}`;
  }
  const s = a.toFixed(12);
  const frac = s.split(".")[1] ?? "";
  let zeros = 0;
  while (frac[zeros] === "0") zeros++;
  if (zeros >= 3) {
    const sig = context === "compact" ? 2 : 4;
    const digits = frac.slice(zeros, zeros + sig);
    return `${sign}$0.0${sub(zeros)}${digits}`;
  }
  const sig = context === "compact" ? 3 : 5;
  const body = trimZeros(a.toPrecision(sig));
  return `${sign}$${body}`;
}

export function formatSol(n: unknown): string {
  if (invalid(n)) return "--";
  const v = n as number;
  if (v === 0) return "0 SOL";
  if (Math.abs(v) < 0.005) return "<0.01 SOL";
  return `${trimZeros(Math.abs(v).toFixed(2))} SOL`;
}

export function shortWallet(wallet: string): string {
  if (wallet.length < 8) return wallet;
  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}
