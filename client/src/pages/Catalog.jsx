import { useState, useEffect } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import {
  Layers,
  Tag,
  Ruler,
  Search,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
  Database,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/DashboardLayout";
import ModuleWorkspace from "../components/navigation/ModuleWorkspace";
import InventoryTopNav from "../components/navigation/InventoryTopNav";
import { buildTableHtml, escapeHtml, printWithTemplate } from "../utils/printTemplate";
import "../styles/Catalog.css";

const MAX_LENGTHS = { categories: 50, brands: 50, units: 50 };

// Validation helpers for catalog items (categories, brands, units - letters and spaces only)
const validateCatalogName = (name, tab) => {
  if (!/^[A-Za-z\s]+$/.test(name)) return "letters-only";
  if (name.length > MAX_LENGTHS[tab]) return "too-long";
  return null;
};
const sanitizeCatalogName = (name) => name.replace(/[^A-Za-z\s]/g, "");

function Catalog() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("categories");
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    setSearchQuery("");
    setCurrentPage(1);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "categories") {
        const res = await api.get('/category');
        setCategories(res.data);
      } else if (activeTab === "brands") {
        const res = await api.get('/brands');
        setBrands(res.data);
      } else if (activeTab === "units") {
        const res = await api.get('/units');
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
    if (activeTab === "categories") return '/category';
    if (activeTab === "brands") return '/brands';
    return '/units';
  };

  // Get payload key based on tab
  const getPayloadKey = () => {
    if (activeTab === "categories") return "category_name";
    if (activeTab === "brands") return "brand_name";
    return "unit_name";
  };

  // Helpers for singular labels
  const getSingular = (tab) => (tab === "categories" ? "category" : tab.slice(0, -1));
  const getSingularCapitalized = (tab) =>
    getSingular(tab).charAt(0).toUpperCase() + getSingular(tab).slice(1);

  // Fetch and show schema details in side panel
  const handleShowSchema = async () => {
    let tableName = activeTab === "categories" ? "category" : activeTab;
    let tableLabel = getSingularCapitalized(activeTab);

    setSchemaPanel(prev => ({ ...prev, loading: true, isOpen: true, tableName, tableLabel }));

    try {
      const res = await api.get(`/schema/table/${tableName}`);
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
    const name = formData.name.trim();
    const maxLen = MAX_LENGTHS[activeTab];

    if (!name) { toast.error("Name is required"); return; }

    const err = validateCatalogName(name, activeTab);
    if (err === "letters-only") {
      toast.error(`${getSingularCapitalized(activeTab)} name can contain letters and spaces only.`);
      return;
    }
    if (err === "too-long") {
      toast.error(`${getSingularCapitalized(activeTab)} name must be ${maxLen} characters or fewer.`);
      return;
    }

    setLoading(true);
    try {
      const payload = { [getPayloadKey()]: formData.name.trim() };
      await api.post(getEndpoint(), payload);

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
    const name = editingName.trim();
    const maxLen = MAX_LENGTHS[activeTab];

    if (!name) { toast.error("Name is required"); return; }

    const err = validateCatalogName(name, activeTab);
    if (err === "letters-only") {
      toast.error(`${getSingularCapitalized(activeTab)} name can contain letters and spaces only.`);
      return;
    }
    if (err === "too-long") {
      toast.error(`${getSingularCapitalized(activeTab)} name must be ${maxLen} characters or fewer.`);
      return;
    }

    setLoading(true);
    try {
      const payload = { [getPayloadKey()]: editingName.trim() };
      await api.patch(`${getEndpoint()}/${id}`, payload);

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
        await api.delete(`${getEndpoint()}/${id}`);
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

  const handleExportPDF = () => {
    const rows = filteredData.map((item) => ([
      escapeHtml(item[fieldNames.id]),
      escapeHtml(item[fieldNames.name]),
      escapeHtml(item.status || "Active"),
    ]));

    const contentHtml = buildTableHtml({
      columns: ["ID", "Name", "Status"],
      rows,
      emptyMessage: "No catalog records found"
    });

    const opened = printWithTemplate({
      title: `${activeTab.charAt(0).toUpperCase()}${activeTab.slice(1)} Catalog`,
      subtitle: `Total records: ${filteredData.length}`,
      contentHtml,
    });

    if (!opened) toast.error("Allow pop-ups to export the report as PDF.");
  };

  // Process search and sorting
  const fieldNames = getFieldNames();
  const rawData = getCurrentData();
  const sortedRawData = [...rawData].sort(
    (a, b) => Number(a[fieldNames.id]) - Number(b[fieldNames.id])
  );

  const filteredData = sortedRawData.filter(item => {
    const term = searchQuery.toLowerCase();
    const idVal = String(item[fieldNames.id]).toLowerCase();
    const nameVal = String(item[fieldNames.name]).toLowerCase();
    return idVal.includes(term) || nameVal.includes(term);
  });

  // Pagination calculation
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Handle page boundaries
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <DashboardLayout active="catalog">
      <ModuleWorkspace nav={InventoryTopNav}>
        <div className="catalog-container">
        {/* Header Block */}
        <div className="catalog-header">
          <div>
            <h1>Catalog Management</h1>
            <p>Administer categories, brand names, and measurement units</p>
          </div>

        </div>

        {/* Tab Controls */}
        <div className="catalog-tabs">
          <button
            type="button"
            className={`tab-btn ${activeTab === "categories" ? "active" : ""}`}
            onClick={() => setActiveTab("categories")}
          >
            <Layers size={18} />
            <span>Categories</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "brands" ? "active" : ""}`}
            onClick={() => setActiveTab("brands")}
          >
            <Tag size={18} />
            <span>Brands</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === "units" ? "active" : ""}`}
            onClick={() => setActiveTab("units")}
          >
            <Ruler size={18} />
            <span>Units</span>
          </button>
        </div>

        {/* Main Content Card */}
        <div className="catalog-content">
          {/* Add Form Container */}
          <div className="add-form-section">
            <h3>Add New {getSingularCapitalized(activeTab)}</h3>
            <form onSubmit={handleAdd} className="add-form">
              <div className="add-input-wrapper">
                <input id="name" name="name"
                  type="text"
                  placeholder={`Enter new ${getSingular(activeTab)} name...`}
                  value={formData.name}
                  maxLength={MAX_LENGTHS[activeTab]}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const sanitized = sanitizeCatalogName(rawValue);
                    if (rawValue !== sanitized) {
                      toast.error("Numbers and symbols are not allowed", { id: "catalog-add-error" });
                    }
                    setFormData({ name: sanitized });
                  }}
                  disabled={loading}
                />
                <span className={`catalog-char-counter ${
                  formData.name.length >= MAX_LENGTHS[activeTab] ? "catalog-char-counter--limit" :
                  formData.name.length >= MAX_LENGTHS[activeTab] * 0.85 ? "catalog-char-counter--warn" : ""
                }`}>
                  {formData.name.length}/{MAX_LENGTHS[activeTab]}
                </span>
              </div>
              <button type="submit" disabled={loading || !formData.name.trim()} className="add-btn">
                <Plus size={18} />
                <span>{loading ? "Adding..." : "Add Item"}</span>
              </button>
            </form>
          </div>

          {/* Search, PDF Export & Pagination Control Bar */}
          <div className="catalog-controller-bar">
            <div className="controller-left">
              <div className="search-box-wrapper">
                <Search className="search-icon" size={18} />
                <input id="searchQuery" name="searchQuery"
                  type="text"
                  placeholder={`Filter ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    const sanitized = sanitizeCatalogName(rawValue);
                    if (rawValue !== sanitized) {
                      toast.error("Numbers and symbols are not allowed when filtering", { id: "catalog-filter-error" });
                    }
                    setSearchQuery(sanitized);
                    setCurrentPage(1);
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="export-link-btn" onClick={handleExportPDF}>
                <FileText size={16} />
                <span>Export PDF</span>
              </div>
            </div>

            <div className="controller-right">
              <span className="pagination-info">
                Showing {totalItems > 0 ? startIndex + 1 : 0}–{endIndex} of {totalItems}
              </span>

              <div className="page-size-selector">
                <select id="pageSize" name="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>

              <div className="pagination-nav">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="page-nav-btn"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="current-page-num">{currentPage} / {totalPages}</span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="page-nav-btn"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Items Vertical Stack Cards Section */}
          <div className="items-section">
            {loading && <div className="loading-spinner-wrapper"><p className="loading-text">Loading catalog data...</p></div>}

            {!loading && totalItems === 0 && (
              <div className="empty-message-wrapper">
                <Info size={24} />
                <p className="empty-message">No matching items found. Create one to begin!</p>
              </div>
            )}

            {!loading && totalItems > 0 && (
              <div className="catalog-card-list">
                {paginatedData.map((item, index) => {
                  const itemId = item[fieldNames.id];
                  const itemName = item[fieldNames.name];
                  const isEditing = editingId === itemId;

                  return (
                    <div
                      key={itemId}
                      className="catalog-card-row stagger-item"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="card-info-left">
                        <span className="card-badge-id">ID #{itemId}</span>
                        {isEditing ? (
                          <>
                          <input id="editingName" name="editingName"
                            type="text"
                            value={editingName}
                            maxLength={MAX_LENGTHS[activeTab]}
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              const sanitized = sanitizeCatalogName(rawValue);
                              if (rawValue !== sanitized) {
                                toast.error("Numbers and symbols are not allowed", { id: "catalog-edit-error" });
                              }
                              setEditingName(sanitized);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(itemId);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                            className="edit-input-inline"
                            autoFocus
                          />
                          <span className={`catalog-char-counter catalog-char-counter--inline ${
                            editingName.length >= MAX_LENGTHS[activeTab] ? "catalog-char-counter--limit" :
                            editingName.length >= MAX_LENGTHS[activeTab] * 0.85 ? "catalog-char-counter--warn" : ""
                          }`}>
                            {editingName.length}/{MAX_LENGTHS[activeTab]}
                          </span>
                          </>
                        ) : (
                          <span
                            className="card-item-name"
                            onClick={() => handleStartEdit(itemId, itemName)}
                            title="Click to edit inline"
                          >
                            {itemName}
                          </span>
                        )}
                      </div>

                      <div className="card-actions-right">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="action-btn-pill save-btn"
                              onClick={() => handleSaveEdit(itemId)}
                              disabled={loading}
                              title="Save Changes"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn-pill cancel-btn"
                              onClick={handleCancelEdit}
                              disabled={loading}
                              title="Cancel Editing"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="action-btn-pill edit-btn"
                              onClick={() => handleStartEdit(itemId, itemName)}
                              disabled={loading}
                              title="Edit Item"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              type="button"
                              className="action-btn-pill delete-btn"
                              onClick={() => handleDeactivate(itemId)}
                              disabled={loading}
                              title="Delete Item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Database Schema Drawer Panel */}
        {schemaPanel.isOpen && (
          <div className="schema-panel-overlay" onClick={closeSchemaPanel}>
            <div className="schema-panel" onClick={(e) => e.stopPropagation()}>
              <div className="schema-panel-header">
                <h2>
                  <Database size={20} />
                  <span>{schemaPanel.tableLabel} Table Structure</span>
                </h2>
                <button
                  type="button"
                  className="close-schema-btn"
                  onClick={closeSchemaPanel}
                  aria-label="Close details"
                >
                  <X size={20} />
                </button>
              </div>

              {schemaPanel.loading ? (
                <div className="schema-loading">Loading database columns...</div>
              ) : schemaPanel.schema ? (
                <div className="schema-details">
                  <div className="schema-info-cards">
                    <div className="info-card">
                      <span className="info-label">Table</span>
                      <span className="info-val">{schemaPanel.schema.tableName}</span>
                    </div>
                    <div className="info-card">
                      <span className="info-label">Columns</span>
                      <span className="info-val">{schemaPanel.schema.columnCount}</span>
                    </div>
                  </div>

                  <div className="schema-table-wrapper">
                    <table className="schema-table">
                      <thead>
                        <tr>
                          <th>Column</th>
                          <th>Type</th>
                          <th>Nullable</th>
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
                            <td className="column-nullable">{attr.nullable ? 'Yes' : 'No'}</td>
                            <td className="column-pk">{attr.primaryKey ? '🔑' : '—'}</td>
                            <td className="column-ai">{attr.autoIncrement ? 'Auto' : '—'}</td>
                            <td className="column-unique">{attr.unique ? 'Yes' : '—'}</td>
                            <td className="column-default">{attr.defaultValue !== null ? String(attr.defaultValue) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="schema-legend">
                    <p><strong>Note:</strong> PK = Primary Key, AI = Auto Incrementing Column</p>
                  </div>
                </div>
              ) : (
                <div className="schema-error">Error fetching database schema.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModuleWorkspace>
  </DashboardLayout>
);
}

export default Catalog;