import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import SuccessAnim from "./SuccessAnim";
import "./ReturnSystem.css";

const ReturnSystem = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("bill_no");
  const [searchResults, setSearchResults] = useState([]);
  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Return Form State
  const [selectedProduct, setSelectedProduct] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [destination, setDestination] = useState("STOCK");
  const [reason, setReason] = useState("");
  const [poId, setPoId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [suggestedSupplierInfo, setSuggestedSupplierInfo] = useState(null);

  useEffect(() => {
    if (selectedProduct && destination === "SUPPLIER") {
      fetchProductPurchaseInfo(selectedProduct);
    }
  }, [selectedProduct, destination]);

  const searchBills = async () => {
    if (!searchQuery.trim()) return toast.error("Enter a search query");
    setLoading(true);
    try {
      const res = await api.get(`/bills/search`, {
        params: {
          query: searchQuery,
          searchType: searchType
        }
      });
      setSearchResults(res.data || []);
      if (res.data?.length === 0) {
        toast.error("No bills found");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Search failed");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectBill = async (bill_id) => {
    setLoading(true);
    try {
      const res = await api.get(`/bills/${bill_id}`);
      if (res.data) {
        setBillData(res.data);
        setSelectedProduct("");
        setSearchResults([]);
        toast.success("Bill loaded");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Bill not found");
      setBillData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductPurchaseInfo = async (productId) => {
    if (!productId) {
      setSuggestedSupplierInfo(null);
      setPoId("");
      setSupplierId("");
      return;
    }

    try {
      const res = await api.get(`/purchase_orders/product/${productId}`);
      setSuggestedSupplierInfo(res.data);
      if (res.data?.po_id) setPoId(String(res.data.po_id));
      if (res.data?.supplier_id) setSupplierId(String(res.data.supplier_id));
    } catch (error) {
      setSuggestedSupplierInfo(null);
      setPoId("");
      setSupplierId("");
    }
  };

  const processReturn = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return toast.error("Select an item to return");
    
    // Find the original item
    const item = billData.bill_items?.find(i => i.product_id === parseInt(selectedProduct));
    if (!item) return toast.error("Item not found in bill");
    
    const qty = parseInt(returnQuantity) || 1;
    const billQty = parseInt(item.quantity) || 0;
    
    if (qty > billQty) {
      return toast.error(`Return quantity cannot exceed ${billQty}`);
    }

    const refundAmnt = (item.total_price / billQty) * qty;
    
    const payload = {
      bill_id: billData.bill_id,
      product_id: item.product_id,
      return_quantity: qty,
      refund_amount: refundAmnt,
      destination,
      reason,
    };

    if (destination === "SUPPLIER") {
      if (poId) payload.po_id = parseInt(poId);
      if (supplierId) payload.supplier_id = parseInt(supplierId);
    }

    try {
      const res = await api.post("/returns/process", payload);
      setSuccessMessage(`Refund Rs${refundAmnt.toFixed(2)} processed successfully.`);
      setShowSuccess(true);
      setBillData(res.data.bill || billData);
      setSelectedProduct("");
      setReturnQuantity(1);
      setDestination("STOCK");
      setReason("");

      setTimeout(() => {
        setShowSuccess(false);
      }, 2500);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to process return");
    }
  };

  if (showSuccess) {
    return (
      <div className="return-success-container">
        <SuccessAnim message="Return Processed Successfully!" />
        <p>{successMessage || 'Refund amount generated.'}</p>
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
            <select id="searchType" name="searchType" 
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="search-type-select"
            >
              <option value="bill_no">Bill Number</option>
              <option value="customer_name">Customer Name</option>
              <option value="phone_no">Phone Number</option>
            </select>
            <input id="searchQuery" name="searchQuery" 
              type="text" 
              placeholder={searchType === 'bill_no' ? 'e.g. INV-2026-0001' : searchType === 'customer_name' ? 'e.g. John Doe' : 'e.g. 9876543210'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button onClick={searchBills} disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className="search-results">
              <p className="results-label">Found {searchResults.length} bill(s):</p>
              <ul className="results-list">
                {searchResults.map((bill) => (
                  <li key={bill.bill_id} className="result-item">
                    <div className="result-info">
                      <span className="bill-no">Bill: {bill.bill_no}</span>
                      <span className="bill-total">Rs{parseFloat(bill.total_amount || 0).toFixed(2)}</span>
                    </div>
                    <button className="select-result-btn" onClick={() => selectBill(bill.bill_id)}>Select</button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {billData && (
            <div className="bill-details">
              <h3>Bill #{billData.bill_id} - {new Date(billData.bill_date).toLocaleString()}</h3>
              <div className="bill-summary-row">
                <span><strong>Total:</strong> Rs{parseFloat(billData.total_amount || 0).toFixed(2)}</span>
                <span><strong>Balance:</strong> Rs{parseFloat(billData.balance_due || 0).toFixed(2)}</span>
                <span><strong>Status:</strong> {billData.status || 'N/A'}</span>
              </div>
              <p>Items in bill:</p>
              <ul className="item-list">
                {billData.bill_items?.map((item) => (
                  <li key={item.product_id} className={parseInt(selectedProduct) === item.product_id ? "selected-item" : ""}>
                    <span>{item.product?.product_name || `Product ID: ${item.product_id}`}</span>
                    <span>Qty: {item.quantity}</span>
                    <button className="select-btn" onClick={() => {
                        setSelectedProduct(item.product_id);
                        setReturnQuantity(1);
                        fetchProductPurchaseInfo(item.product_id);
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
                {selectedProduct && billData?.bill_items && (
                  (() => {
                    const item = billData.bill_items.find(i => i.product_id === parseInt(selectedProduct));
                    return item ? (
                      <input id="returnQuantity" name="returnQuantity" 
                        type="number" 
                        min="1" 
                        max={item.quantity}
                        value={returnQuantity} 
                        onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
                        required 
                      />
                    ) : null;
                  })()
                )}
              </div>

              <div className="form-group">
                <label>Condition / Destination</label>
                <div className="radio-group">
                  <label>
                    <input id="radio_field" name="radio_field" 
                      type="radio" 
                      value="STOCK" 
                      checked={destination === "STOCK"}
                      onChange={() => setDestination("STOCK")}
                    />
                    📦 Back to Stock (Good Condition)
                  </label>
                  <label>
                    <input id="radio_field" name="radio_field" 
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
                <textarea id="reason" name="reason" 
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
                    <input id="poId" name="poId" 
                      type="number" 
                      value={poId} 
                      onChange={(e) => setPoId(e.target.value)} 
                      placeholder="Linked PO Number"
                    />
                  </div>
                  <div className="form-group">
                    <label>Supplier ID (Optional)</label>
                    <input id="supplierId" name="supplierId" 
                      type="number" 
                      value={supplierId} 
                      onChange={(e) => setSupplierId(e.target.value)} 
                      placeholder="Supplier ID"
                    />
                  </div>

                  {suggestedSupplierInfo && (
                    <div className="info-box">
                      Suggested PO: #{suggestedSupplierInfo.po_id} / Supplier: #{suggestedSupplierInfo.supplier_id} {suggestedSupplierInfo.supplier_name ? `(${suggestedSupplierInfo.supplier_name})` : ''}
                    </div>
                  )}

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
