// File: src/lib/paymentFee.ts

export type PaymentMethod =
  | "qris"
  | "dana"
  | "ovo"
  | "gopay"
  | "shopeepay"
  | "transfer_bank"
  | "virtual_account";

export interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  description: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { value: "qris", label: "QRIS", description: "QRIS / E-Wallet" },
  { value: "dana", label: "DANA", description: "E-Wallet DANA" },
  { value: "ovo", label: "OVO", description: "E-Wallet OVO" },
  { value: "gopay", label: "GOPAY", description: "E-Wallet GoPay" },
  { value: "shopeepay", label: "ShopeePay", description: "ShopeePay" },
  { value: "transfer_bank", label: "Transfer Bank", description: "TF Bank" },
  { value: "virtual_account", label: "Virtual Account", description: "VA" },
];

function roundUpToNearest500(amount: number) {
  return Math.ceil(amount / 500) * 500;
}

export function getPaymentFee(method: PaymentMethod, amount: number): number {
  let fee = 0;
  switch (method) {
    case "qris":
      fee = amount * 0.007;
      break;
    case "dana":
      fee = amount * 0.01665;
      break;
    case "ovo":
      fee = amount * 0.01665;
      break;
    case "gopay":
      fee = amount * 0.02;
      break;
    case "shopeepay":
      fee = amount * 0.02;
      break;
    case "transfer_bank":
      fee = 4000 + 4000 * 0.11;
      break;
    case "virtual_account":
      fee = 4000 + 4000 * 0.11;
      break;
    default:
      fee = 0;
  }
  return roundUpToNearest500(fee);
}

export function toMidtransPaymentCode(method: PaymentMethod): string {
  switch (method) {
    case "qris":
      return "other_qris";
    case "dana":
      return "dana";
    case "ovo":
      return "ovo";
    case "gopay":
      return "gopay";
    case "shopeepay":
      return "shopeepay";
    case "transfer_bank":
    case "virtual_account":
      return "other_va";
    default:
      return method;
  }
}
