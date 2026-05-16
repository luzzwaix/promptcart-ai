import type {
  BusinessBlueprint,
  CheckoutSession,
  Order,
  PaymentReceipt,
  ProfitabilityAssessment,
  SpendEvent,
  WalletSnapshot,
} from "@/lib/types";

const now = () => new Date().toISOString();

export interface LocusCheckoutGateway {
  createCheckoutSession(input: {
    order: Order;
    business: BusinessBlueprint;
  }): Promise<CheckoutSession>;
  simulateSuccessfulPayment(input: {
    session: CheckoutSession;
    order: Order;
  }): Promise<PaymentReceipt>;
}

export interface LocusWalletClient {
  creditPaymentRevenue(input: {
    wallet: WalletSnapshot;
    receipt: PaymentReceipt;
  }): Promise<WalletSnapshot>;
  reserveFulfillmentBudget(input: {
    wallet: WalletSnapshot;
    assessment: ProfitabilityAssessment;
  }): Promise<WalletSnapshot>;
  settleSpend(input: {
    wallet: WalletSnapshot;
    spendEvents: SpendEvent[];
  }): Promise<WalletSnapshot>;
}

export class DemoLocusCheckoutGateway implements LocusCheckoutGateway {
  async createCheckoutSession(input: {
    order: Order;
    business: BusinessBlueprint;
  }): Promise<CheckoutSession> {
    return {
      id: `demo-session-${input.order.id}`,
      orderId: input.order.id,
      mode: "demo",
      createdAt: now(),
    };
  }

  async simulateSuccessfulPayment(input: {
    session: CheckoutSession;
    order: Order;
  }): Promise<PaymentReceipt> {
    return {
      id: `demo-payment-${input.order.id}`,
      sessionId: input.session.id,
      orderId: input.order.id,
      amountCents: input.order.quotedPriceCents,
      mode: "demo",
      paidAt: now(),
    };
  }
}

export class DemoLocusWalletClient implements LocusWalletClient {
  async creditPaymentRevenue(input: {
    wallet: WalletSnapshot;
    receipt: PaymentReceipt;
  }): Promise<WalletSnapshot> {
    return {
      ...input.wallet,
      availableBalanceCents:
        input.wallet.availableBalanceCents + input.receipt.amountCents,
      creditedTodayCents:
        input.wallet.creditedTodayCents + input.receipt.amountCents,
    };
  }

  async reserveFulfillmentBudget(input: {
    wallet: WalletSnapshot;
    assessment: ProfitabilityAssessment;
  }): Promise<WalletSnapshot> {
    return {
      ...input.wallet,
      reservedCents: input.assessment.estimatedSpendCents,
    };
  }

  async settleSpend(input: {
    wallet: WalletSnapshot;
    spendEvents: SpendEvent[];
  }): Promise<WalletSnapshot> {
    const settledSpend = input.spendEvents.reduce(
      (total, spend) => total + spend.amountCents,
      0,
    );

    return {
      availableBalanceCents: input.wallet.availableBalanceCents - settledSpend,
      startingBalanceCents: input.wallet.startingBalanceCents,
      reservedCents: 0,
      creditedTodayCents: input.wallet.creditedTodayCents,
      spentTodayCents: settledSpend,
    };
  }
}
