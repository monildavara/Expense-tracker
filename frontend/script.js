/**
 * Frontend Script for Expense Tracker
 * Interacts with the Node.js Express REST API backed by PostgreSQL.
 */

const API_BASE = window.location.origin.startsWith('http')
  ? `${window.location.origin}/api`
  : 'http://localhost:3000/api';

// DOM Elements
const manualExpenseForm = document.getElementById('manualExpenseForm');
const manualAmount = document.getElementById('manualAmount');
const manualCategory = document.getElementById('manualCategory');
const manualDescription = document.getElementById('manualDescription');
const manualDate = document.getElementById('manualDate');

const expensesTableBody = document.getElementById('expensesTableBody');
const emptyTableMessage = document.getElementById('emptyTableMessage');
const filterCategory = document.getElementById('filterCategory');
const filterMonth = document.getElementById('filterMonth');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

const totalExpenseAmount = document.getElementById('totalExpenseAmount');
const totalExpenseCount = document.getElementById('totalExpenseCount');
const categoryBreakdownGrid = document.getElementById('categoryBreakdownGrid');

const alertBox = document.getElementById('alertBox');
const alertMessage = document.getElementById('alertMessage');
const alertIcon = document.getElementById('alertIcon');
const alertCloseBtn = document.getElementById('alertCloseBtn');

const editModal = document.getElementById('editModal');
const editExpenseForm = document.getElementById('editExpenseForm');
const editExpenseId = document.getElementById('editExpenseId');
const editAmount = document.getElementById('editAmount');
const editCategory = document.getElementById('editCategory');
const editDescription = document.getElementById('editDescription');
const editDate = document.getElementById('editDate');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

// Add Category Modal Elements
const addCategoryModal = document.getElementById('addCategoryModal');
const addCategoryForm = document.getElementById('addCategoryForm');
const newCategoryInput = document.getElementById('newCategoryInput');
const categoryModalError = document.getElementById('categoryModalError');
const openAddCategoryBtnManual = document.getElementById('openAddCategoryBtnManual');
const openAddCategoryBtnFilter = document.getElementById('openAddCategoryBtnFilter');
const closeCategoryModalBtn = document.getElementById('closeCategoryModalBtn');
const cancelCategoryBtn = document.getElementById('cancelCategoryBtn');

let alertTimer = null;
let availableCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Other'];

// ==========================================
// Notifications & Alerts
// ==========================================
function showAlert(message, type = 'info', duration = 4500) {
  if (alertTimer) clearTimeout(alertTimer);

  alertBox.className = `alert-box ${type}`;
  alertMessage.textContent = message;

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };
  alertIcon.textContent = icons[type] || 'ℹ️';

  alertBox.classList.remove('hidden');

  if (duration > 0) {
    alertTimer = setTimeout(() => {
      alertBox.classList.add('hidden');
    }, duration);
  }
}

alertCloseBtn.addEventListener('click', () => {
  alertBox.classList.add('hidden');
});

// Format currency in Indian Rupees (₹)
function formatCurrency(num) {
  return '₹' + Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Get current year and month formatted as YYYY-MM
function getCurrentYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Set default date to today
function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  if (manualDate) manualDate.value = today;
}

// Set default month filter to current month and year
function setDefaultMonthFilter() {
  if (filterMonth) {
    filterMonth.value = getCurrentYearMonth();
  }
}

// ==========================================
// Category Management
// ==========================================

// Load categories from backend
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    const categories = await res.json();

    if (Array.isArray(categories) && categories.length > 0) {
      availableCategories = categories;
    }

    renderCategoryDropdowns();
  } catch (err) {
    console.error('Error loading categories:', err);
    renderCategoryDropdowns();
  }
}

// Populate all category dropdowns in the UI
function renderCategoryDropdowns() {
  const currentFilterVal = filterCategory.value || 'All';
  const currentManualVal = manualCategory.value || '';
  const currentEditVal = editCategory.value || '';

  // 1. Filter dropdown
  filterCategory.innerHTML = '<option value="All">All Categories</option>';
  availableCategories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    filterCategory.appendChild(opt);
  });
  if (availableCategories.includes(currentFilterVal) || currentFilterVal === 'All') {
    filterCategory.value = currentFilterVal;
  }

  // 2. Manual form dropdown
  manualCategory.innerHTML = '';
  availableCategories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    manualCategory.appendChild(opt);
  });
  if (currentManualVal && availableCategories.includes(currentManualVal)) {
    manualCategory.value = currentManualVal;
  }

  // 3. Edit modal dropdown
  editCategory.innerHTML = '';
  availableCategories.forEach((cat) => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    editCategory.appendChild(opt);
  });
  if (currentEditVal && availableCategories.includes(currentEditVal)) {
    editCategory.value = currentEditVal;
  }
}

// Open Category Modal
function openCategoryModal() {
  newCategoryInput.value = '';
  categoryModalError.classList.add('hidden');
  addCategoryModal.classList.remove('hidden');
  newCategoryInput.focus();
}

// Close Category Modal
function closeCategoryModal() {
  addCategoryModal.classList.add('hidden');
}

openAddCategoryBtnManual.addEventListener('click', openCategoryModal);
openAddCategoryBtnFilter.addEventListener('click', openCategoryModal);
closeCategoryModalBtn.addEventListener('click', closeCategoryModal);
cancelCategoryBtn.addEventListener('click', closeCategoryModal);

// Auto-capitalize first letter as user types in new category input
newCategoryInput.addEventListener('input', () => {
  categoryModalError.classList.add('hidden');
  const val = newCategoryInput.value;
  if (val.length > 0) {
    newCategoryInput.value = val.charAt(0).toUpperCase() + val.slice(1);
  }
});

// Handle Add Category Form Submit
addCategoryForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const rawVal = newCategoryInput.value.trim();
  if (!rawVal) return;

  // Capitalize first letter
  const formattedCategory = rawVal.charAt(0).toUpperCase() + rawVal.slice(1);

  // Validate if category already exists (case-insensitive)
  const alreadyExists = availableCategories.some(
    (c) => c.toLowerCase() === formattedCategory.toLowerCase()
  );

  if (alreadyExists) {
    categoryModalError.textContent = 'This category already exists!';
    categoryModalError.classList.remove('hidden');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: formattedCategory })
    });

    const data = await res.json();

    if (!res.ok) {
      categoryModalError.textContent = data.error || 'This category already exists!';
      categoryModalError.classList.remove('hidden');
      return;
    }

    closeCategoryModal();
    showAlert(`Category "${formattedCategory}" added successfully!`, 'success');

    // Refresh categories from server
    await loadCategories();

    // Select the newly added category in the manual form
    manualCategory.value = formattedCategory;

    // Refresh summary breakdown to include new category
    await loadSummary();
  } catch (err) {
    categoryModalError.textContent = 'Server connection error. Please try again.';
    categoryModalError.classList.remove('hidden');
  }
});

// ==========================================
// API Calls: Expenses & Summary
// ==========================================

// 1. Fetch Summary
async function loadSummary() {
  try {
    const month = filterMonth.value;
    const params = new URLSearchParams();
    if (month) params.append('month', month);

    const url = params.toString() ? `${API_BASE}/expenses/summary?${params.toString()}` : `${API_BASE}/expenses/summary`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load summary');
    const data = await res.json();

    totalExpenseAmount.textContent = formatCurrency(data.overallTotal);
    totalExpenseCount.textContent = `${data.totalCount} transaction${data.totalCount === 1 ? '' : 's'}`;

    // Render Category Breakdown for all available categories
    categoryBreakdownGrid.innerHTML = '';
    availableCategories.forEach((cat) => {
      const amount = data.byCategory[cat] || 0;
      const card = document.createElement('div');
      card.className = 'category-card';
      card.innerHTML = `
        <span class="cat-label">${escapeHtml(cat)}</span>
        <span class="cat-amount">${formatCurrency(amount)}</span>
      `;
      categoryBreakdownGrid.appendChild(card);
    });
  } catch (err) {
    console.error('Error fetching summary:', err);
  }
}

// 2. Fetch Expenses with active filters
async function loadExpenses() {
  try {
    const cat = filterCategory.value;
    const month = filterMonth.value;

    const params = new URLSearchParams();
    if (cat && cat !== 'All') params.append('category', cat);
    if (month) params.append('month', month);

    const url = params.toString() ? `${API_BASE}/expenses?${params.toString()}` : `${API_BASE}/expenses`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load expenses');
    const expenses = await res.json();

    renderExpensesTable(expenses);
  } catch (err) {
    console.error('Error loading expenses:', err);
    showAlert('Could not connect to backend server. Make sure it is running on port 3000.', 'error');
  }
}

// Render Table Rows
function renderExpensesTable(expenses) {
  expensesTableBody.innerHTML = '';

  if (!expenses || expenses.length === 0) {
    emptyTableMessage.classList.remove('hidden');
    return;
  }

  emptyTableMessage.classList.add('hidden');

  expenses.forEach((exp) => {
    const tr = document.createElement('tr');
    const catClass = ['Food', 'Travel', 'Bills', 'Shopping', 'Health', 'Other'].includes(exp.category)
      ? `cat-${exp.category}`
      : 'cat-Other';

    tr.innerHTML = `
      <td>${escapeHtml(exp.date)}</td>
      <td><strong>${escapeHtml(exp.description)}</strong></td>
      <td>
        <span class="category-pill ${catClass}">${escapeHtml(exp.category)}</span>
      </td>
      <td class="text-right amount-cell">${formatCurrency(exp.amount)}</td>
      <td class="text-center">
        <button class="action-btn edit" title="Edit" onclick="openEditModal('${exp.id}', '${escapeAttr(exp.description)}', ${exp.amount}, '${escapeAttr(exp.category)}', '${exp.date}')">✏️ Edit</button>
        <button class="action-btn delete" title="Delete" onclick="deleteExpenseItem('${exp.id}')">🗑️ Delete</button>
      </td>
    `;
    expensesTableBody.appendChild(tr);
  });
}

// Helpers: Escape HTML and attributes
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ==========================================
// Event Handlers
// ==========================================

// Handle Manual Expense Form Submit
manualExpenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const newExpense = {
    amount: parseFloat(manualAmount.value),
    category: manualCategory.value,
    description: manualDescription.value.trim(),
    date: manualDate.value
  };

  try {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add manual expense.');
    }

    manualAmount.value = '';
    manualDescription.value = '';
    setDefaultDate();

    showAlert('Manual expense saved successfully!', 'success');
    await loadExpenses();
    await loadSummary();
  } catch (err) {
    showAlert(err.message, 'error');
  }
});

// Filters
filterCategory.addEventListener('change', () => {
  loadExpenses();
});

filterMonth.addEventListener('input', () => {
  loadExpenses();
  loadSummary();
});

// Reset Filters button: resets category to 'All' and month to current month and year
clearFiltersBtn.addEventListener('click', () => {
  filterCategory.value = 'All';
  setDefaultMonthFilter();
  loadExpenses();
  loadSummary();
});

// Delete Expense
async function deleteExpenseItem(id) {
  if (!confirm('Are you sure you want to delete this expense?')) return;

  try {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'DELETE'
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete expense.');
    }

    showAlert('Expense deleted successfully.', 'info');
    await loadExpenses();
    await loadSummary();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

// Edit Modal Handling
function openEditModal(id, description, amount, category, date) {
  editExpenseId.value = id;
  editDescription.value = description;
  editAmount.value = amount;
  editCategory.value = category;
  editDate.value = date;
  editModal.classList.remove('hidden');
}

function closeEditModal() {
  editModal.classList.add('hidden');
}

closeModalBtn.addEventListener('click', closeEditModal);
cancelEditBtn.addEventListener('click', closeEditModal);

// Close modal when clicking outside of it
window.addEventListener('click', (e) => {
  if (e.target === editModal) {
    closeEditModal();
  }
  if (e.target === addCategoryModal) {
    closeCategoryModal();
  }
});

// Submit Edit Form
editExpenseForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editExpenseId.value;
  const updatedData = {
    amount: parseFloat(editAmount.value),
    category: editCategory.value,
    description: editDescription.value.trim(),
    date: editDate.value
  };

  try {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update expense.');
    }

    closeEditModal();
    showAlert('Expense updated successfully!', 'success');
    await loadExpenses();
    await loadSummary();
  } catch (err) {
    showAlert(err.message, 'error');
  }
});

// Global functions for HTML inline onclick
window.deleteExpenseItem = deleteExpenseItem;
window.openEditModal = openEditModal;

// Initial Page Load
document.addEventListener('DOMContentLoaded', async () => {
  setDefaultDate();
  setDefaultMonthFilter(); // By default shows current month and current year
  await loadCategories();
  await loadExpenses();
  await loadSummary();
});
