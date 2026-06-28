import { Copy, CreditCard, Sparkles, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { appApi } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { CheckoutPayload, Order, PaymentCheckoutInfo, PaymentMethod, PaymentPlan } from "../types/models";

const presetAmounts = [50, 100, 200, 500] as const;

type PurchaseMode = "balance" | "subscription";

function formatCurrency(amount: number) {
  return `CNY ${amount.toFixed(2)}`;
}

function validityLabel(plan: PaymentPlan) {
  const unit = plan.validityUnit === "month" ? "month" : plan.validityUnit === "week" ? "week" : "day";
  return `${plan.validityDays} ${unit}${plan.validityDays > 1 ? "s" : ""}`;
}

export function RechargePage() {
  const { token, refreshUser } = useAuth();
  const [checkoutInfo, setCheckoutInfo] = useState<PaymentCheckoutInfo | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("balance");
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(presetAmounts[1]);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [checkout, setCheckout] = useState<CheckoutPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function load() {
      if (!token) {
        return;
      }
      try {
        setLoading(true);
        const response = await appApi.getPaymentCheckoutInfo(token);
        setCheckoutInfo(response);
        setMethods(response.methods);
        setSelectedMethod(response.methods[0]?.methodCode ?? "");
        setSelectedPlan(response.plans[0] ?? null);
        setPurchaseMode(response.plans.length > 0 && response.balanceDisabled ? "subscription" : "balance");
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Failed to load payment checkout information.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token]);

  const activeMethod = useMemo(
    () => methods.find((method) => method.methodCode === selectedMethod) ?? null,
    [methods, selectedMethod]
  );

  const creditedBalance = useMemo(() => {
    if (!checkoutInfo) {
      return rechargeAmount;
    }
    return rechargeAmount * checkoutInfo.balanceRechargeMultiplier;
  }, [checkoutInfo, rechargeAmount]);

  const orderPreviewAmount = purchaseMode === "subscription" ? selectedPlan?.price ?? 0 : rechargeAmount;
  const displayTotal = purchaseMode === "subscription" ? selectedPlan?.price ?? 0 : creditedBalance;
  const hasMethods = methods.length > 0;
  const hasPlans = (checkoutInfo?.plans.length ?? 0) > 0;
  const balanceAvailable = !checkoutInfo?.balanceDisabled;
  const canCreateBalanceOrder =
    hasMethods &&
    balanceAvailable &&
    rechargeAmount > 0 &&
    rechargeAmount >= (checkoutInfo?.globalMin || 0) &&
    (checkoutInfo?.globalMax ? rechargeAmount <= checkoutInfo.globalMax : true) &&
    (activeMethod?.singleMin ? rechargeAmount >= activeMethod.singleMin : true) &&
    (activeMethod?.singleMax ? rechargeAmount <= activeMethod.singleMax : true);
  const canCreateSubscriptionOrder = hasMethods && hasPlans && Boolean(selectedPlan);
  const canCreateOrder = purchaseMode === "subscription" ? canCreateSubscriptionOrder : canCreateBalanceOrder;

  const checkoutStateMessage = useMemo(() => {
    if (loading) {
      return "Loading payment checkout configuration.";
    }
    if (!checkoutInfo) {
      return "Payment configuration is not available yet.";
    }
    if (!hasMethods) {
      return "No payment methods are enabled yet. Configure payment in sub2api admin first.";
    }
    if (purchaseMode === "balance" && checkoutInfo.balanceDisabled) {
      return "Balance recharge is currently disabled by backend configuration.";
    }
    if (purchaseMode === "subscription" && !hasPlans) {
      return "No subscription plans are available for sale yet.";
    }
    if (purchaseMode === "balance" && rechargeAmount <= 0) {
      return "Enter a valid recharge amount before creating an order.";
    }
    if (purchaseMode === "balance" && checkoutInfo.globalMin > 0 && rechargeAmount < checkoutInfo.globalMin) {
      return `Recharge amount must be at least ${formatCurrency(checkoutInfo.globalMin)}.`;
    }
    if (purchaseMode === "balance" && checkoutInfo.globalMax > 0 && rechargeAmount > checkoutInfo.globalMax) {
      return `Recharge amount must not exceed ${formatCurrency(checkoutInfo.globalMax)}.`;
    }
    if (purchaseMode === "balance" && activeMethod?.singleMin && rechargeAmount < activeMethod.singleMin) {
      return `${activeMethod.methodName} requires at least ${formatCurrency(activeMethod.singleMin)}.`;
    }
    if (purchaseMode === "balance" && activeMethod?.singleMax && rechargeAmount > activeMethod.singleMax) {
      return `${activeMethod.methodName} allows up to ${formatCurrency(activeMethod.singleMax)} per order.`;
    }
    if (purchaseMode === "subscription" && !selectedPlan) {
      return "Choose a subscription plan to continue.";
    }
    return activeMethod
      ? `Selected ${activeMethod.methodName}. Create an order to get the provider payload.`
      : "Choose a payment method to continue.";
  }, [activeMethod, checkoutInfo, hasMethods, hasPlans, loading, purchaseMode, rechargeAmount, selectedPlan]);

  async function createOrder() {
    if (!token || !selectedMethod || !canCreateOrder) {
      return;
    }

    try {
      if (purchaseMode === "subscription") {
        if (!selectedPlan) {
          setError("Please choose a subscription plan.");
          return;
        }
        const response = await appApi.createOrder(token, {
          packageName: selectedPlan.name,
          amount: selectedPlan.price,
          bonusAmount: 0,
          methodCode: selectedMethod,
          orderType: "subscription",
          planId: selectedPlan.id
        });
        setCurrentOrder(response.item);
        setCheckout(response.checkout);
      } else {
        const response = await appApi.createOrder(token, {
          packageName: `Balance recharge ${rechargeAmount}`,
          amount: rechargeAmount,
          bonusAmount: Math.max(0, creditedBalance - rechargeAmount),
          methodCode: selectedMethod,
          orderType: "balance"
        });
        setCurrentOrder(response.item);
        setCheckout(response.checkout);
      }
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create order.");
    }
  }

  async function checkPaymentStatus() {
    if (!token || !currentOrder) {
      return;
    }

    try {
      const response = await appApi.payOrder(token, currentOrder.id);
      setCurrentOrder(response.item);
      setError(null);
      await refreshUser();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to verify payment.");
    }
  }

  async function copyText(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedField(label);
    window.setTimeout(() => setCopiedField(""), 1200);
  }

  return (
    <section className="page-section">
      <div className="section-header">
        <div>
          <p className="eyebrow">Recharge</p>
          <h2>Recharge and payment</h2>
          <p>The page now reads real payment methods, limits, and sellable plans from the backend checkout configuration.</p>
        </div>
      </div>

      <div className="two-column-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Choose what to buy</h3>
              <p>Balance recharge and subscription purchase now share the same checkout surface.</p>
            </div>
          </div>

          <div className="row-actions">
            <button
              className={`secondary-button${purchaseMode === "balance" ? " is-active" : ""}`}
              type="button"
              onClick={() => setPurchaseMode("balance")}
              disabled={checkoutInfo?.balanceDisabled || !hasMethods}
            >
              <Wallet size={16} />
              <span>Balance recharge</span>
            </button>
            <button
              className={`secondary-button${purchaseMode === "subscription" ? " is-active" : ""}`}
              type="button"
              onClick={() => setPurchaseMode("subscription")}
              disabled={!hasPlans || !hasMethods}
            >
              <Sparkles size={16} />
              <span>Subscription plan</span>
            </button>
          </div>

          {purchaseMode === "balance" ? (
            <div className="stack-list">
              {checkoutInfo?.balanceDisabled ? (
                <div className="form-error">Balance recharge is currently disabled. You can enable it later in `sub2api` payment settings.</div>
              ) : null}
              <div className="option-grid">
                {presetAmounts.map((amount) => (
                  <button
                    className={`option-card${rechargeAmount === amount ? " is-active" : ""}`}
                    type="button"
                    key={amount}
                  onClick={() => setRechargeAmount(amount)}
                  disabled={checkoutInfo?.balanceDisabled || !hasMethods}
                >
                    <strong>{formatCurrency(amount)}</strong>
                    <span>Balance recharge</span>
                    <small>Credited {formatCurrency(amount * (checkoutInfo?.balanceRechargeMultiplier ?? 1))}</small>
                  </button>
                ))}
              </div>

              <label>
                <span>Custom amount</span>
                <input
                  type="number"
                  min={checkoutInfo?.globalMin || 1}
                  max={checkoutInfo?.globalMax || undefined}
                  value={rechargeAmount}
                  onChange={(event) => setRechargeAmount(Number(event.target.value || 0))}
                  disabled={checkoutInfo?.balanceDisabled || !hasMethods}
                />
              </label>

              <div className="stack-row">
                <div>
                  <strong>Recharge limits</strong>
                  <span>
                    Global min {formatCurrency(checkoutInfo?.globalMin ?? 0)} | Global max{" "}
                    {checkoutInfo?.globalMax ? formatCurrency(checkoutInfo.globalMax) : "Unlimited"}
                  </span>
                </div>
                <em>{formatCurrency(creditedBalance)}</em>
              </div>
            </div>
          ) : (
            <div className="stack-list">
              {!hasPlans ? (
                <div className="form-error">No subscription plans are currently published for sale.</div>
              ) : null}
              {(checkoutInfo?.plans ?? []).map((plan) => (
                <button
                  className={`method-row${selectedPlan?.id === plan.id ? " is-active" : ""}`}
                  type="button"
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  disabled={!hasMethods}
                >
                  <div>
                    <strong>{plan.name}</strong>
                    <span>
                      {plan.groupPlatform || "subscription"} | {validityLabel(plan)}
                    </span>
                    <span>{plan.description}</span>
                  </div>
                  <em>{formatCurrency(plan.price)}</em>
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Select a payment method</h3>
              <p>Methods and limits are now backend-configured and can expand with upstream provider configuration.</p>
            </div>
          </div>

          <div className="stack-list">
            {!hasMethods ? (
              <div className="form-error">No payment methods are enabled yet. Configure visible methods and provider instances in `sub2api` admin.</div>
            ) : null}
            {methods.map((method) => (
              <button
                className={`method-row${selectedMethod === method.methodCode ? " is-active" : ""}`}
                type="button"
                key={method.methodCode}
                onClick={() => setSelectedMethod(method.methodCode)}
              >
                <div>
                  <strong>{method.methodName}</strong>
                  <span>
                    {method.methodCode} | {method.providerName}
                  </span>
                  <span>
                    Min {formatCurrency(method.singleMin ?? 0)} | Max {method.singleMax ? formatCurrency(method.singleMax) : "Unlimited"}
                  </span>
                </div>
                <CreditCard size={18} />
              </button>
            ))}
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="checkout-box">
            <div>
              <span>{purchaseMode === "subscription" ? "Order amount" : "Credited balance"}</span>
              <strong>{formatCurrency(displayTotal)}</strong>
            </div>
            <p>{checkout ? `Checkout payload generated for ${checkout.providerName}.` : checkoutStateMessage}</p>
            <div className="row-actions">
              <button className="primary-button" type="button" onClick={createOrder} disabled={!canCreateOrder}>
                Create order
              </button>
              <button className="secondary-button" type="button" onClick={checkPaymentStatus} disabled={!currentOrder || currentOrder.status === "paid"}>
                <Sparkles size={16} />
                <span>{currentOrder?.status === "paid" ? "Paid" : "Check payment status"}</span>
              </button>
            </div>
          </div>

          {checkoutInfo?.helpText ? (
            <div className="panel" style={{ marginTop: "1rem" }}>
              <div className="panel-heading">
                <div>
                  <h3>Payment notice</h3>
                  <p>{checkoutInfo.helpText}</p>
                </div>
              </div>
            </div>
          ) : null}
        </article>
      </div>

      {selectedPlan && purchaseMode === "subscription" ? (
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Selected plan</h3>
              <p>The user-facing app can now surface backend sellable plans without hardcoding the catalog.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row">
              <div>
                <strong>{selectedPlan.name}</strong>
                <span>
                  {selectedPlan.groupName || selectedPlan.groupPlatform} | {validityLabel(selectedPlan)}
                </span>
              </div>
              <em>{formatCurrency(selectedPlan.price)}</em>
            </div>
            {selectedPlan.features.map((feature) => (
              <div className="activity-item" key={feature}>
                <span className="activity-dot" />
                <p>{feature}</p>
              </div>
            ))}
          </div>
        </article>
      ) : null}

      {checkout ? (
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h3>Checkout payload</h3>
              <p>This payload can drive redirect, QR, or provider-specific submit flows without exposing backend secrets.</p>
            </div>
          </div>

          <div className="stack-list">
            <div className="stack-row">
              <div>
                <strong>Provider</strong>
                <span>
                  {checkout.providerName} | {checkout.providerCode} | {checkout.mode}
                </span>
              </div>
              <em>{checkout.methodCode}</em>
            </div>
            <div className="stack-row">
              <div>
                <strong>Submit URL</strong>
                <span>{checkout.submitUrl || "Provider-specific inline flow"}</span>
              </div>
              <button className="secondary-button" type="button" onClick={() => copyText("submit", checkout.submitUrl || "")}>
                <Copy size={16} />
                <span>{copiedField === "submit" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="stack-row">
              <div>
                <strong>Notify URL</strong>
                <span>{checkout.notifyUrl}</span>
              </div>
              <button className="secondary-button" type="button" onClick={() => copyText("notify", checkout.notifyUrl)}>
                <Copy size={16} />
                <span>{copiedField === "notify" ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="stack-row">
              <div>
                <strong>Return URL</strong>
                <span>{checkout.returnUrl}</span>
              </div>
              <button className="secondary-button" type="button" onClick={() => copyText("return", checkout.returnUrl)}>
                <Copy size={16} />
                <span>{copiedField === "return" ? "Copied" : "Copy"}</span>
              </button>
            </div>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(checkout.submitFields).map(([key, value]) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {currentOrder ? (
            <div className="stack-list" style={{ marginTop: "1rem" }}>
              <div className="stack-row">
                <div>
                  <strong>Current order</strong>
                  <span>
                    {currentOrder.orderNo} | {currentOrder.packageName} | {currentOrder.status}
                  </span>
                </div>
                <em>{formatCurrency(currentOrder.amount + currentOrder.bonusAmount)}</em>
              </div>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
