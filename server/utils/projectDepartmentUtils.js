function normalizeDepartmentSelection(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))];
  }

  if (typeof value === 'string') {
    return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))];
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [String(value).trim()].filter(Boolean);
}

function serializeDepartmentSelection(value) {
  return JSON.stringify(normalizeDepartmentSelection(value));
}

module.exports = {
  normalizeDepartmentSelection,
  serializeDepartmentSelection,
};
