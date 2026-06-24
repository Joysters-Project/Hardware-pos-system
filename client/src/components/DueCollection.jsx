import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { validateSriLankanPhone, filterSriLankanPhoneInput } from "../utils/phoneValidation";
import SuccessAnim from "./SuccessAnim";
import DashboardLayout from "./DashboardLayout";
import "../styles/DueCollection.css";

const DueCollection = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [customer, setCustomer] = useState(null);
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [amountInput, setAmountInput] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [successAmount, setSuccessAmount] = useState(0);

  // Animation states
  const [showSuccess, setShowSuccess] = useState(false);
  const [animSuccess, setAnimSuccess] = useState(false);

  const handleSuccessDismiss = () => {
    setAnimSuccess(false);
    setTimeout(() => {
      setShowSuccess(false);
    }, 300);
  };

  // Perform search
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
      const foundCus = cusRes.data.data || cusRes.data; 
      
      if (!foundCus || !foundCus.customer_id) {
        toast.error("Customer not found.");
        return;
      }
      setCustomer(foundCus);

      const billRes = await api.get(`/bills?customer_id=${foundCus.customer_id}&status=PARTIAL`);
      setBills(billRes.data || []);
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

  // On Bill Selection
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

  const billTotal = selectedBill ? parseFloat(selectedBill.total_amount) : 0;
  const balanceDue = selectedBill ? parseFloat(selectedBill.balance_due) : 0;
  const paidSoFar = billTotal - balanceDue;
  
  const collectAmount = parseFloat(amountInput) || 0;
  const afterCollection = Math.max(0, balanceDue - collectAmount);
  
  const totalOutstanding = bills.reduce((acc, b) => acc + parseFloat(b.balance_due), 0);

  const formatDate = (d) => {
    if (!d) return "";
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) + " " + (date.getFullYear() !== new Date().getFullYear() ? date.getFullYear() : '');
  };

  const formatTime = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("en-GB", { hour: '2-digit', minute:'2-digit' });
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
        collected_by: cashierId
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

  return (
    <DashboardLayout active="due-collection">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">💼 Due Collection</h1>
          <p className="admin-page-subtitle">Collect outstanding balance from partial bills</p>
        </div>
      </div>

      <div className="due-content" style={{ marginTop: '8px' }}>
        {/* Left Panel */}
        <div className="due-left">
          <div className="due-search-box">
            <input 
              type="tel" 
              placeholder="Search by 10-digit phone number (070-078)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(filterSriLankanPhoneInput(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              maxLength="10"
            />
            <button onClick={handleSearch}>Search</button>
          </div>

          {customer && (
            <div className="customer-summary">
              <div className="avatar-info">
                <div className="avatar">
                  {customer.customer_name ? customer.customer_name.substring(0, 2).toUpperCase() : customer.name.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, color: '#333' }}>{customer.customer_name || customer.name}</h3>
                  <small style={{ color: '#777' }}>{customer.phone} · {bills.length} partial bills</small>
                </div>
              </div>
              <div>
                <div style={{ color: '#777', fontSize: '13px' }}>Total outstanding</div>
                <div className="val-red" style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  Rs {totalOutstanding.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          <div className="card-title">Outstanding bills</div>
          <div className="bills-table-container">
            {bills.length === 0 ? (
              <p style={{ color: '#aaa', padding: '20px 0' }}>No outstanding bills found.</p>
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
                  {bills.map(bill => (
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
                          <span style={{ fontWeight: 'bold', color: '#333' }}>{bill.bill_no}</span>
                        </div>
                      </td>
                      <td>{formatDate(bill.bill_date)}</td>
                      <td><strong>Rs.</strong> {parseFloat(bill.total_amount).toFixed(2)}</td>
                      <td className="val-red" style={{ fontWeight: 'bold' }}><strong>Rs.</strong> {parseFloat(bill.balance_due).toFixed(2)}</td>
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
              {paymentHistory.map(hist => (
                <div className="history-item" key={hist.payment_id}>
                  <div>
                    <strong>Rs {parseFloat(hist.amount_paid).toFixed(2)}</strong> — {hist.payment_method}
                  </div>
                  <div style={{ color: '#777' }}>
                    {formatDate(hist.payment_date)}, {formatTime(hist.payment_date)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="due-right">
          <h2 className="card-title" style={{ fontSize: '20px' }}>Collect payment</h2>

          <div className="collection-summary">
            <div className="row">
              <span>Bill</span>
              <span>
                {selectedBill ? selectedBill.bill_no : "--"}
              </span>
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
                style={{ paddingLeft: '30px' }}
                value={amountInput} 
                onChange={(e) => setAmountInput(e.target.value)}
                disabled={!selectedBill}
                min="1"
                max={balanceDue}
                step="0.01"
              />
            </div>
          </div>

          <label style={{ color: '#aaa', marginBottom: '10px', display: 'block' }}>Payment method</label>
          <div className="method-pills">
            {["Cash", "Card", "Transfer"].map(method => (
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
            <div style={{ marginBottom: '5px' }}>After collection</div>
            {selectedBill ? (
              afterCollection <= 0 ? (
                <span className="green">Balance: <strong>Rs.</strong> 0 — Fully paid</span>
              ) : (
                <span style={{ color: '#333', fontWeight: 'bold' }}>Balance: <strong>Rs.</strong> {afterCollection.toFixed(2)}</span>
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

      <SuccessAnim 
        show={showSuccess} 
        animate={animSuccess} 
        onDismiss={handleSuccessDismiss} 
        message="Payment Received"
        subMessage={`Successfully collected Rs. ${successAmount.toFixed(2)}`}
      />
    </DashboardLayout>
  );
};

export default DueCollection;
