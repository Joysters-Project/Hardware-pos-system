import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import SuccessAnim from "./SuccessAnim";
import "./ReturnSystem.css";

const ReturnSystem = () => {
  const navigate = useNavigate();
  const [billId, setBillId] = useState("");
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Return Form State
  const [selectedProduct, setSelectedProduct] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [destination, setDestination] = useState("STOCK");
  const [reason, setReason] = useState("");
  const [poId, setPoId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const searchBill = async () => {
    if (!billId) return toast.error("Enter a Bill ID");
    setLoading(true);
    try {
      const res = await api.get(`/bills/${billId}`);
      if (res.data) {
        setBillData(res.data);
        setSelectedProduct("");
        toast.success("Bill loaded");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Bill not found");
      setBillData(null);
    } finally {
      setLoading(false);
    }
  };

  const processReturn = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return toast.error("Select an item to return");
    
    // Find the original item
    const item = billData.bill_items?.find(i => i.product_id === parseInt(selectedProduct));
    if (!item) return toast.error("Item not found in bill");
    
    if (returnQuantity > item.quantity) {
      return toast.error(`Max return quantity is ${item.quantity}`);
    }

    const refundAmnt = (item.total_price / item.quantity) * returnQuantity;
    
    const payload = {
      bill_id: billData.bill_id,
      product_id: item.product_id,
      return_quantity: returnQuantity,
      refund_amount: refundAmnt,
      destination,
      reason,
    };

    if (destination === "SUPPLIER") {
      if (poId) payload.po_id = parseInt(poId);
      if (supplierId) payload.supplier_id = parseInt(supplierId);
    }

    try {
      await api.post("/returns/process", payload);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setBillData(null);
        setBillId("");
        setSelectedProduct("");
        setReturnQuantity(1);
        setDestination("STOCK");
        setReason("");
      }, 2500);
    } catch (err) {
      toast.error("Failed to process return");
    }
  };

  if (showSuccess) {
    return (
      <div className="return-success-container">
        <SuccessAnim message="Return Processed Successfully!" />
        <p>Refund amount generated.</p>
      </div>
    );
  }

  return (
    <div className="return-system">
      <div className="return-header">
        <button onClick={() => navigate(-1)} className="back-btn">⬅ Back</button>
        <h1>↩️ Sales Return Processing</h1>
      </div>

      <div className="return-content">
        {/* Left Side: Search & Bill Info */}
        <div className="search-section card">
          <h2>Find Bill</h2>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Enter Bill Number (e.g. 100)" 
              value={billId}
              onChange={(e) => setBillId(e.target.value)}
            />
            <button onClick={searchBill} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {billData && (
            <div className="bill-details">
              <h3>Bill #{billData.bill_id} - {billData.bill_date}</h3>
              <p>Items in bill:</p>
              <ul className="item-list">
                {billData.bill_items?.map((item) => (
                  <li key={item.product_id} className={parseInt(selectedProduct) === item.product_id ? "selected-item" : ""}>
                    <span>{item.product?.product_name || `Product ID: ${item.product_id}`}</span>
                    <span>Qty: {item.quantity}</span>
                    <button className="select-btn" onClick={() => {
                        setSelectedProduct(item.product_id);
                        setReturnQuantity(1);
                    }}>Select</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Side: Return Form */}
        <div className="form-section card">
          <h2>Process Return</h2>
          {!selectedProduct ? (
            <p className="placeholder-text">Please search a bill and select an item to return.</p>
          ) : (
            <form onSubmit={processReturn} className="return-form">
              <div className="form-group">
                <label>Return Quantity</label>
                <input 
                  type="number" 
                  min="1" 
                  value={returnQuantity} 
                  onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
                  required 
                />
              </div>

              <div className="form-group">
                <label>Condition / Destination</label>
                <div className="radio-group">
                  <label>
                    <input 
                      type="radio" 
                      value="STOCK" 
                      checked={destination === "STOCK"}
                      onChange={() => setDestination("STOCK")}
                    />
                    📦 Back to Stock (Good Condition)
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      value="SUPPLIER" 
                      checked={destination === "SUPPLIER"}
                      onChange={() => setDestination("SUPPLIER")}
                    />
                    🏭 Return to Supplier (Defective Batch)
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Reason for Return</label>
                <textarea 
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder="E.g. Wrong item, damaged box..."
                  required
                />
              </div>

              {destination === "SUPPLIER" && (
                <div className="supplier-fields">
                  <div className="form-group">
                    <label>Purchase Order ID (Optional)</label>
                    <input 
                      type="number" 
                      value={poId} 
                      onChange={(e) => setPoId(e.target.value)} 
                      placeholder="Linked PO Number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Supplier ID (Optional)</label>
                    <input 
                      type="number" 
                      value={supplierId} 
                      onChange={(e) => setSupplierId(e.target.value)} 
                      placeholder="Supplier ID"
                    />
                  </div>
                  <div className="warning-box">
                    ⚠️ Stock will NOT be incremented. Manager approval may be required to process Debit Note.
                  </div>
                </div>
              )}

              <button type="submit" className="submit-return-btn">Confirm Return</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnSystem;
