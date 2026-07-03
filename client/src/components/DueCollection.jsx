import React, { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { validateSriLankanPhone, filterSriLankanPhoneInput } from "../utils/phoneValidation";
import SuccessAnim from "./SuccessAnim";
import DashboardLayout from "./DashboardLayout";
import "../styles/DueCollection.css";

const DueCollection = () => {
  const [activeView, setActiveView] = useState("checking");
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountInput, setAmountInput] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [successAmount, setSuccessAmount] = useState(0);
  const [dueCheckQuery, setDueCheckQuery] = useState("");
  const [dueCheckCustomer, setDueCheckCustomer] = useState(null);
  const [dueCheckBills, setDueCheckBills] = useState([]);
  const [dueCheckLoading, setDueCheckLoading] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState(null);

  const [showSuccess, setShowSuccess] = useState(false);
  const [animSuccess, setAnimSuccess] = useState(false);
  const [viewEnter, setViewEnter] = useState(false);

  useEffect(() => {
    setViewEnter(false);
    const timer = window.setTimeout(() => setViewEnter(true), 16);
    return () => window.clearTimeout(timer);
  }, [activeView]);

  const handleSuccessDismiss = () => {
    setAnimSuccess(false);
    setTimeout(() => {
      setShowSuccess(false);
    }, 300);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return toast.error("Enter a phone number");
    }

    const phoneValidation = validateSriLankanPhone(searchQuery);
    if (!phoneValidation.isValid) {
      return toast.error(phoneValidation.message);
    }

    try {
      const cusRes = await api.get(`/customers?phone=${encodeURIComponent(phoneValidation.formatted)}`);
      const foundCus = cusRes.data?.data || cusRes.data;

      if (!foundCus || !foundCus.customer_id) {
        toast.error("Customer not found.");
        return;
      }
      setCustomer(foundCus);

      const billRes = await api.get(`/bills?customer_id=${foundCus.customer_id}&status=PARTIAL`);
      const billList = Array.isArray(billRes.data) ? billRes.data : billRes.data?.data || [];
      setBills(billList);
      setSelectedBill(null);
      setAmountInput("");
    } catch (error) {
      console.error(error);
      if (error.response?.status === 404) {
        toast.error("Customer not found.");
      } else {
        toast.error("Failed to search records.");
      }
    }
  };

  const handleSelectBill = async (bill) => {
    setSelectedBill(bill);
    setAmountInput(bill.balance_due);
    try {
      const histRes = await api.get(`/payments?bill_id=${bill.bill_id}`);
      setPaymentHistory(histRes.data || []);
    } catch (err) {
      console.error("Failed to fetch payment history");
    }
  };

  const handleDueCheckSearch = async () => {
    if (!dueCheckQuery.trim()) {
      return toast.error("Enter a customer name or phone number");
    }

    setDueCheckLoading(true);
    try {
      const trimmedQuery = dueCheckQuery.trim();
      const phoneValidation = validateSriLankanPhone(trimmedQuery);
      let customerData = null;

      if (phoneValidation.isValid) {
        const cusRes = await api.get(`/customers?phone=${encodeURIComponent(phoneValidation.formatted)}`);
        customerData = cusRes.data?.data || cusRes.data;
      } else {
        const cusRes = await api.get("/customers");
        const customerList = Array.isArray(cusRes.data) ? cusRes.data : cusRes.data?.data || [];
        const target = trimmedQuery.toLowerCase();
        customerData = customerList.find((item) => {
          const name = (item.customer_name || item.name || "").toLowerCase();
          const phone = (item.phone_no || item.phone || "").toString();
          return name.includes(target) || phone.includes(target.replace(/\D/g, ""));
        });
      }

      if (!customerData || !customerData.customer_id) {
        setDueCheckCustomer(null);
        setDueCheckBills([]);
        return toast.error("No customer found.");
      }

      setDueCheckCustomer(customerData);
      const billRes = await api.get(`/bills?customer_id=${customerData.customer_id}&status=PARTIAL`);
      const billList = Array.isArray(billRes.data) ? billRes.data : billRes.data?.data || [];
      setDueCheckBills(billList);
    } catch (error) {
      console.error(error);
      setDueCheckCustomer(null);
      setDueCheckBills([]);
      toast.error("Unable to load due summary right now.");
    } finally {
      setDueCheckLoading(false);
    }
  };

  const billTotal = selectedBill ? parseFloat(selectedBill.total_amount) : 0;
  const balanceDue = selectedBill ? parseFloat(selectedBill.balance_due) : 0;
  const paidSoFar = billTotal - balanceDue;
  const collectAmount = parseFloat(amountInput) || 0;
  const afterCollection = Math.max(0, balanceDue - collectAmount);
  const totalOutstanding = bills.reduce((acc, bill) => acc + parseFloat(bill.balance_due || 0), 0);
  const dueCheckOutstanding = dueCheckBills.reduce((acc, bill) => acc + parseFloat(bill.balance_due || 0), 0);
  const paidAmount = (bill) => parseFloat(bill.total_amount || 0) - parseFloat(bill.balance_due || 0);

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) + " " + (date.getFullYear() !== new Date().getFullYear() ? date.getFullYear() : "");
  };

  const formatTime = (value) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  const submitPayment = async () => {
    if (!selectedBill) return;
    if (collectAmount <= 0) return toast.error("Enter a valid amount");
    if (collectAmount > balanceDue) return toast.error(`Payment cannot exceed ${balanceDue}`);

    try {
      const cashierId = localStorage.getItem("cashierId") || localStorage.getItem("userId");

      await api.post("/payments", {
        bill_id: selectedBill.bill_id,
        amount_paid: collectAmount,
        payment_method: paymentMethod.toUpperCase(),
        collected_by: cashierId,
      });

      setSuccessAmount(collectAmount);
      setShowSuccess(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimSuccess(true));
      });

      handleSearch();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Payment collection failed.");
    }
  };

  const renderCollectionView = () => (
    <div className="due-content" style={{ marginTop: "8px" }}>
      <div className="due-left">
        <div className="due-search-box">
          <input
            type="tel"
            placeholder="Search by 10-digit phone number (070-078)..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(filterSriLankanPhoneInput(event.target.value))}
            onKeyDown={(event) => event.key === "Enter" && handleSearch()}
            maxLength="10"
          />
          <button type="button" onClick={handleSearch}>Search</button>
        </div>

        {customer && (
          <div className="customer-summary">
            <div className="avatar-info">
              <div className="avatar">
                {(customer.customer_name || customer.name || "")
                  .toString()
                  .substring(0, 2)
                  .toUpperCase() || "CU"}
              </div>
              <div>
                <h3 style={{ margin: 0, color: "#333" }}>{customer.customer_name || customer.name}</h3>
                <small style={{ color: "#777" }}>{customer.phone_no || customer.phone} · {bills.length} partial bills</small>
              </div>
            </div>
            <div>
              <div style={{ color: "#777", fontSize: "13px" }}>Total outstanding</div>
              <div className="val-red" style={{ fontSize: "18px", fontWeight: "bold" }}>
                Rs {totalOutstanding.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="card-title">Outstanding bills</div>
        <div className="bills-table-container">
          {bills.length === 0 ? (
            <p style={{ color: "#aaa", padding: "20px 0" }}>No outstanding bills found.</p>
          ) : (
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr
                    key={bill.bill_id}
                    className={selectedBill?.bill_id === bill.bill_id ? "selected" : ""}
                    onClick={() => handleSelectBill(bill)}
                  >
                    <td>
                      <div className="custom-radio">
                        <input
                          type="radio"
                          name="bill_select"
                          checked={selectedBill?.bill_id === bill.bill_id}
                          readOnly
                        />
                        <span style={{ fontWeight: "bold", color: "#333" }}>{bill.bill_no}</span>
                      </div>
                    </td>
                    <td>{formatDate(bill.bill_date)}</td>
                    <td><strong>Rs.</strong> {parseFloat(bill.total_amount).toFixed(2)}</td>
                    <td className="val-red" style={{ fontWeight: "bold" }}><strong>Rs.</strong> {parseFloat(bill.balance_due).toFixed(2)}</td>
                    <td>
                      <span className="badge-partial">Partial</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedBill && paymentHistory.length > 0 && (
          <div className="history-box">
            <div className="card-title">Payment history for {selectedBill.bill_no}</div>
            {paymentHistory.map((hist) => (
              <div className="history-item" key={hist.payment_id}>
                <div>
                  <strong>Rs {parseFloat(hist.amount_paid).toFixed(2)}</strong> — {hist.payment_method}
                </div>
                <div style={{ color: "#777" }}>
                  {formatDate(hist.payment_date)}, {formatTime(hist.payment_date)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="due-right">
        <h2 className="card-title" style={{ fontSize: "20px" }}>Collect payment</h2>

        <div className="collection-summary">
          <div className="row">
            <span>Bill</span>
            <span>{selectedBill ? selectedBill.bill_no : "--"}</span>
          </div>
          <div className="row">
            <span>Bill total</span>
            <span><strong>Rs.</strong> {billTotal.toFixed(2)}</span>
          </div>
          <div className="row">
            <span>Paid so far</span>
            <span><strong>Rs.</strong> {paidSoFar.toFixed(2)}</span>
          </div>
          <div className="row bold">
            <span>Balance due</span>
            <span className="val-red"><strong>Rs.</strong> {balanceDue.toFixed(2)}</span>
          </div>
        </div>

        <div className="amount-input-group">
          <label>Amount collecting now</label>
          <div>
            <span className="amount-symbol"><strong>Rs.</strong></span>
            <input
              type="number"
              style={{ paddingLeft: "50px" }}
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              disabled={!selectedBill}
              min="1"
              max={balanceDue}
              step="0.01"
            />
          </div>
        </div>

        <label style={{ color: "#aaa", marginBottom: "10px", display: "block" }}>Payment method</label>
        <div className="method-pills">
          {["Cash", "Card", "Transfer"].map((method) => (
            <div
              key={method}
              className={paymentMethod === method ? "active" : ""}
              onClick={() => setPaymentMethod(method)}
            >
              {method}
            </div>
          ))}
        </div>

        <div className="after-collection">
          <div style={{ marginBottom: "5px" }}>After collection</div>
          {selectedBill ? (
            afterCollection <= 0 ? (
              <span className="green">Balance: <strong>Rs.</strong> 0 — Fully paid</span>
            ) : (
              <span style={{ color: "#333", fontWeight: "bold" }}>Balance: <strong>Rs.</strong> {afterCollection.toFixed(2)}</span>
            )
          ) : (
            <span>--</span>
          )}
        </div>

        <button
          className="collect-btn"
          disabled={!selectedBill || collectAmount <= 0 || collectAmount > balanceDue}
          onClick={submitPayment}
        >
          Collect <strong>Rs.</strong> {collectAmount ? collectAmount.toFixed(2) : "0.00"}
        </button>
      </div>
    </div>
  );

  const renderDueCheckingView = () => (
    <div className="due-content" style={{ marginTop: "8px" }}>
      <div className="due-left">
        <div className="due-search-box">
          <input
            type="text"
            placeholder="Search by customer name or phone number"
            value={dueCheckQuery}
            onChange={(event) => setDueCheckQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleDueCheckSearch()}
          />
          <button type="button" onClick={handleDueCheckSearch} disabled={dueCheckLoading}>
            {dueCheckLoading ? "Checking..." : "Check Due"}
          </button>
        </div>

        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-label">Customer</span>
            <strong className="summary-value">{dueCheckCustomer ? dueCheckCustomer.customer_name || dueCheckCustomer.name : "—"}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Phone</span>
            <strong className="summary-value">{dueCheckCustomer ? dueCheckCustomer.phone_no || dueCheckCustomer.phone || "—" : "—"}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Outstanding Bills</span>
            <strong className="summary-value">{dueCheckBills.length}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Total Due</span>
            <strong className="summary-value val-red">Rs {dueCheckOutstanding.toFixed(2)}</strong>
          </div>
        </div>

        <div className="card-title">Due breakdown</div>
        <div className="bills-table-container">
          {!dueCheckCustomer ? (
            <p style={{ color: "#aaa", padding: "20px 0" }}>Search a customer to review their outstanding balance.</p>
          ) : dueCheckBills.length === 0 ? (
            <p style={{ color: "#aaa", padding: "20px 0" }}>No outstanding bills found for this customer.</p>
          ) : (
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Bill No.</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dueCheckBills.map((bill) => {
                  const isExpanded = expandedBillId === bill.bill_id;
                  return (
                    <React.Fragment key={bill.bill_id}>
                      <tr>
                        <td><strong>{bill.bill_no}</strong></td>
                        <td>{formatDate(bill.bill_date)}</td>
                        <td><strong>Rs.</strong> {parseFloat(bill.total_amount || 0).toFixed(2)}</td>
                        <td><strong>Rs.</strong> {paidAmount(bill).toFixed(2)}</td>
                        <td className="val-red" style={{ fontWeight: "bold" }}><strong>Rs.</strong> {parseFloat(bill.balance_due || 0).toFixed(2)}</td>
                        <td>
                          <div className="due-status-cell">
                            <span className="badge-partial">Partial</span>
                            <button
                              type="button"
                              className="due-details-toggle"
                              onClick={() => setExpandedBillId(isExpanded ? null : bill.bill_id)}
                              aria-label={`Show product details for ${bill.bill_no}`}
                            >
                              {isExpanded ? "▾" : "▸"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="due-details-row">
                          <td colSpan="6">
                            <div className="due-product-details">
                              <div className="due-product-details-header">Product details</div>
                              {(bill.bill_items || []).length > 0 ? (
                                <table className="due-product-table">
                                  <thead>
                                    <tr>
                                      <th>Product</th>
                                      <th>Quantity</th>
                                      <th>Price (Rs)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bill.bill_items.map((item) => (
                                      <tr key={item.bill_item_id || `${item.product_id}-${item.product_name}`}>
                                        <td>{item.product?.product_name || item.product_name || "Product"}</td>
                                        <td>{item.qty || item.quantity || 0}</td>
                                        <td>{parseFloat(item.price_per_unit ?? item.unit_price ?? item.price ?? 0).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              ) : (
                                <p className="due-empty-state">No product details available for this bill.</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="due-right">
        <h2 className="card-title" style={{ fontSize: "20px" }}>Customer due summary</h2>
        <div className="collection-summary">
          <div className="row">
            <span>Customer</span>
            <span>{dueCheckCustomer ? dueCheckCustomer.customer_name || dueCheckCustomer.name : "—"}</span>
          </div>
          <div className="row">
            <span>Phone</span>
            <span>{dueCheckCustomer ? dueCheckCustomer.phone_no || dueCheckCustomer.phone || "—" : "—"}</span>
          </div>
          <div className="row">
            <span>Outstanding bills</span>
            <span>{dueCheckBills.length}</span>
          </div>
          <div className="row bold">
            <span>Total due</span>
            <span className="val-red">Rs {dueCheckOutstanding.toFixed(2)}</span>
          </div>
        </div>
        <div className="after-collection">
          <div style={{ marginBottom: "5px" }}>Quick insight</div>
          <span style={{ color: "#333", fontWeight: "bold" }}>
            {dueCheckCustomer ? "Use this view to review dues before collection." : "Search for a customer to preview their due balance and bill history."}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout active="due-collection">
      <div className="cashier-page-shell">
        <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">💼 Due</h1>
          <p className="admin-page-subtitle">Track dues and collect outstanding balances with a clear customer view</p>
        </div>
      </div>

      <div className="due-nav-tabs">
        <button
          type="button"
          className={`due-nav-tab${activeView === "checking" ? " active" : ""}`}
          onClick={() => setActiveView("checking")}
        >
          Due Checking
        </button>
        <button
          type="button"
          className={`due-nav-tab${activeView === "collection" ? " active" : ""}`}
          onClick={() => setActiveView("collection")}
        >
          Due Collection
        </button>
      </div>

      <div className={`due-view-shell ${viewEnter ? "due-view-shell-active" : ""}`}>
        {activeView === "collection" ? renderCollectionView() : renderDueCheckingView()}
      </div>

        <SuccessAnim
          show={showSuccess}
          animate={animSuccess}
          onDismiss={handleSuccessDismiss}
          message="Payment Received"
          subMessage={`Successfully collected Rs. ${successAmount.toFixed(2)}`}
        />
      </div>
    </DashboardLayout>
  );
};

export default DueCollection;
