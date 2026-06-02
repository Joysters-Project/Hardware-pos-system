import { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { useAuth } from "../context/AuthContext";
import "../styles/Catalog.css";

const API_BASE = "http://localhost:5000/api";

function Catalog() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({ name: "" });
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  // Schema details panel state
  const [schemaPanel, setSchemaPanel] = useState({
    isOpen: false,
    tableName: null,
    tableLabel: null,
    schema: null,
    loading: false,
  });

  // Fetch data based on active tab
  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "categories") {
        const res = await axios.get(`${API_BASE}/category`);
        setCategories(res.data);
      } else if (activeTab === "brands") {
        const res = await axios.get(`${API_BASE}/brands`);
        setBrands(res.data);
      } else if (activeTab === "units") {
        const res = await axios.get(`${API_BASE}/units`);
        setUnits(res.data);
      }
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    if (activeTab === "categories") return categories;
    if (activeTab === "brands") return brands;
    return units;
  };

  // Get field names based on tab
  const getFieldNames = () => {
    if (activeTab === "categories") return { id: "category_id", name: "category_name" };
    if (activeTab === "brands") return { id: "brand_id", name: "brand_name" };
    return { id: "unit_id", name: "unit_name" };
  };

  // Get API endpoint based on tab
  const getEndpoint = () => {
    if (activeTab === "categories") return `${API_BASE}/category`;
    if (activeTab === "brands") return `${API_BASE}/brands`;
    return `${API_BASE}/units`;
  };

  // Get payload key based on tab
  const getPayloadKey = () => {
    if (activeTab === "categories") return "category_name";
    if (activeTab === "brands") return "brand_name";
    return "unit_name";
  };

  // Helpers for singular labels (fix "Categorie" -> "Category")
  const getSingular = (tab) => (tab === "categories" ? "category" : tab.slice(0, -1));
  const getSingularCapitalized = (tab) =>
    getSingular(tab).charAt(0).toUpperCase() + getSingular(tab).slice(1);

  // Fetch and show schema details in side panel
  const handleShowSchema = async () => {
    let tableName = activeTab === "categories" ? "category" : activeTab;
    let tableLabel = getSingularCapitalized(activeTab);

    setSchemaPanel(prev => ({ ...prev, loading: true, isOpen: true, tableName, tableLabel }));

    try {
      const res = await axios.get(`${API_BASE}/schema/table/${tableName}`);
      setSchemaPanel(prev => ({
        ...prev,
        schema: res.data,
        loading: false,
      }));
    } catch (error) {
      toast.error("Failed to load table schema");
      console.error(error);
      setSchemaPanel(prev => ({ ...prev, loading: false }));
    }
  };

  // Close schema panel
  const closeSchemaPanel = () => {
    setSchemaPanel({
      isOpen: false,
      tableName: null,
      tableLabel: null,
      schema: null,
      loading: false,
    });
  };

  // Add new item
  const handleAdd = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      const payload = { [getPayloadKey()]: formData.name.trim() };
      const res = await axios.post(getEndpoint(), payload);
      
      toast.success(`${getSingular(activeTab)} created successfully`);
      setFormData({ name: "" });
      loadData();
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.message || "Name already exists");
      } else {
        toast.error(error.response?.data?.error || "Failed to create item");
      }
    } finally {
      setLoading(false);
    }
  };

  // Start editing
  const handleStartEdit = (id, currentName) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  // Save edit
  const handleSaveEdit = async (id) => {
    if (!editingName.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    try {
      const payload = { [getPayloadKey()]: editingName.trim() };
      await axios.patch(`${getEndpoint()}/${id}`, payload);
      
      toast.success("Updated successfully");
      setEditingId(null);
      setEditingName("");
      loadData();
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error(error.response.data.message || "Name already exists");
      } else {
        toast.error(error.response?.data?.error || "Failed to update item");
      }
    } finally {
      setLoading(false);
    }
  };

  // Deactivate (soft delete with product check)
  const handleDeactivate = async (id) => {
    const fieldNames = getFieldNames();
    const item = getCurrentData().find(item => item[fieldNames.id] === id);
    
    if (window.confirm(`Are you sure you want to delete "${item[fieldNames.name]}"?`)) {
      setLoading(true);
      try {
        await axios.delete(`${getEndpoint()}/${id}`);
        toast.success("Deleted successfully");
        loadData();
      } catch (error) {
        if (error.response?.status === 400) {
          const linkedCount = error.response.data.linkedProductCount || 0;
          toast.error(
            `Cannot delete: ${linkedCount} product(s) linked to this ${getSingular(activeTab)}. ` +
            "Please update or remove the products first."
          );
        } else {
          toast.error(error.response?.data?.error || "Failed to delete item");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const fieldNames = getFieldNames();
  const currentData = getCurrentData();
  const sortedCurrentData = [...currentData].sort(
    (a, b) => Number(a[fieldNames.id]) - Number(b[fieldNames.id])
  );

  const DashboardComponent = user?.role === "manager" ? ManagerDashboard : AdminDashboard;

  return (
    <DashboardComponent active="catalog">
      <div className="catalog-container">
        <div className="catalog-header">
          <h1>📋 Catalog Management</h1>
          <p>Manage Categories, Brands, and Units</p>
        </div>

        {/* Tabs */}
        <div className="catalog-tabs">
          <button
            className={`tab-btn ${activeTab === "categories" ? "active" : ""}`}
            onClick={() => setActiveTab("categories")}
          >
            📁 Categories
          </button>
          <button
            className={`tab-btn ${activeTab === "brands" ? "active" : ""}`}
            onClick={() => setActiveTab("brands")}
          >
            🏷️ Brands
          </button>
          <button
            className={`tab-btn ${activeTab === "units" ? "active" : ""}`}
            onClick={() => setActiveTab("units")}
          >
            📏 Units
          </button>
        </div>

        {/* Tab Content */}
        <div className="catalog-content">
          {/* Add Form */}
          <div className="add-form-section">
            <h3>Add New {getSingularCapitalized(activeTab)}</h3>
            <form onSubmit={handleAdd} className="add-form">
              <input
                type="text"
                placeholder={`Enter ${getSingular(activeTab)} name...`}
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                disabled={loading}
              />
              <button type="submit" disabled={loading} className="add-btn">
                {loading ? "Adding..." : "✚ Add"}
              </button>
            </form>
          </div>

          {/* Items List */}
          <div className="items-section">
            <div className="items-section-header">
              <h3>
                {activeTab === "categories" && "Categories"}
                {activeTab === "brands" && "Brands"}
                {activeTab === "units" && "Units"}
              </h3>
              
            </div>

            {loading && <p className="loading-text">Loading...</p>}

            {!loading && currentData.length === 0 && (
              <p className="empty-message">No items yet. Add one to get started!</p>
            )}

            {!loading && sortedCurrentData.length > 0 && (
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCurrentData.map((item) => (
                    <tr key={item[fieldNames.id]} className="table-row">
                      <td className="cell-id">{item[fieldNames.id]}</td>
                      <td className="cell-name">
                        {editingId === item[fieldNames.id] ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="edit-input-inline"
                            autoFocus
                          />
                        ) : (
                          <span
                            className="name-text"
                            onClick={() => handleStartEdit(item[fieldNames.id], item[fieldNames.name])}
                            title="Click to edit"
                          >
                            {item[fieldNames.name]}
                          </span>
                        )}
                      </td>
                      <td className="cell-actions">
                        {editingId === item[fieldNames.id] ? (
                          <div className="action-buttons-editing">
                            <button
                              className="save-btn"
                              onClick={() => handleSaveEdit(item[fieldNames.id])}
                              disabled={loading}
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              className="cancel-btn"
                              onClick={handleCancelEdit}
                              disabled={loading}
                              title="Cancel"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="action-buttons">
                            <button
                              className="edit-btn"
                              onClick={() => handleStartEdit(item[fieldNames.id], item[fieldNames.name])}
                              disabled={loading}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeactivate(item[fieldNames.id])}
                              disabled={loading}
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Schema Details Side Panel */}
          {schemaPanel.isOpen && (
            <div className="schema-panel-overlay" onClick={closeSchemaPanel}>
              <div className="schema-panel" onClick={(e) => e.stopPropagation()}>
                <div className="schema-panel-header">
                  <h2>📊 {schemaPanel.tableLabel} Table Schema</h2>
                  <button 
                    className="close-schema-btn"
                    onClick={closeSchemaPanel}
                    aria-label="Close panel"
                  >
                    ✕
                  </button>
                </div>

                {schemaPanel.loading ? (
                  <div className="schema-loading">Loading schema...</div>
                ) : schemaPanel.schema ? (
                  <div className="schema-details">
                    <div className="schema-info">
                      <p><strong>Table Name:</strong> {schemaPanel.schema.tableName}</p>
                      <p><strong>Total Columns:</strong> {schemaPanel.schema.columnCount}</p>
                    </div>

                    <table className="schema-table">
                      <thead>
                        <tr>
                          <th>Column Name</th>
                          <th>Type</th>
                          <th>Null</th>
                          <th>PK</th>
                          <th>AI</th>
                          <th>Unique</th>
                          <th>Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schemaPanel.schema.attributes.map((attr, idx) => (
                          <tr key={idx}>
                            <td className="column-name">{attr.columnName}</td>
                            <td className="column-type">{attr.type}</td>
                            <td className="column-nullable">{attr.nullable ? '✓' : '✗'}</td>
                            <td className="column-pk">{attr.primaryKey ? '✓' : '—'}</td>
                            <td className="column-ai">{attr.autoIncrement ? '✓' : '—'}</td>
                            <td className="column-unique">{attr.unique ? '✓' : '—'}</td>
                            <td className="column-default">{attr.defaultValue || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="schema-legend">
                      <p><strong>Legend:</strong> PK = Primary Key, AI = Auto Increment, ✓ = Yes, ✗ = No, — = None</p>
                    </div>
                  </div>
                ) : (
                  <div className="schema-error">Failed to load schema</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardComponent>
  );
}

export default Catalog;