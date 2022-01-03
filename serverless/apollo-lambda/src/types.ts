export enum Frequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
}

export enum PeriodType {
  DAY = "DAY",
  WEEK = "WEEK",
  MONTH = "MONTH",
}

export enum PaymentType {
  PAYOUT = "PAYOUT",
  CONTRIBUTION = "CONTRIBUTION",
  BANKERFEE = "BANKERFEE",
}

export type Ledger = {
  paymentFrequency?: Frequency;
};

export type Participant = {
  name: string;
  email: string;
};
