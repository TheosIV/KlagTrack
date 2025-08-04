document.addEventListener('DOMContentLoaded', () => {
    const todayTab = document.getElementById('today-tab');
    const overviewTab = document.getElementById('overview-tab');
    const historyTab = document.getElementById('history-tab');

    const navToday = document.getElementById('nav-today');
    const navOverview = document.getElementById('nav-overview');
    const navHistory = document.getElementById('nav-history');

    const tabs = [todayTab, overviewTab, historyTab];
    const navs = [navToday, navOverview, navHistory];

    function showTab(tabToShow) {
        tabs.forEach(tab => {
            tab.classList.remove('active');
        });
        navs.forEach(nav => {
            nav.classList.remove('active');
        });

        tabToShow.classList.add('active');
        if (tabToShow === todayTab) navToday.classList.add('active');
        if (tabToShow === overviewTab) navOverview.classList.add('active');
        if (tabToShow === historyTab) navHistory.classList.add('active');
    }

    navToday.addEventListener('click', () => showTab(todayTab));
    navOverview.addEventListener('click', () => showTab(overviewTab));
    navHistory.addEventListener('click', () => showTab(historyTab));

    // --- App State ---
    let currentData = {}; // Holds all daily entries, keyed by date 'YYYY-MM-DD'

    // --- DOM Elements ---
    const dailyForm = document.getElementById('daily-form');
    const dateInput = document.getElementById('date');
    const hoursInput = document.getElementById('hours');
    const tipsInput = document.getElementById('tips');
    const expenseList = document.getElementById('expense-list');
    const addExpenseBtn = document.getElementById('add-expense-btn');
    const presetExpensesContainer = document.getElementById('preset-expenses');
    const notesInput = document.getElementById('notes');
    const copyPrevDayBtn = document.getElementById('copy-prev-day-btn');

    // Daily Summary DOM Elements
    const summaryHourlyRate = document.getElementById('summary-hourly-rate');
    const summaryIncome = document.getElementById('summary-income');
    const summaryExpenses = document.getElementById('summary-expenses');
    const summaryNet = document.getElementById('summary-net');


    // --- Calculation Functions ---

    function updateDailySummary(date) {
        const entry = currentData[date] || {};
        const hours = entry.hours || 0;
        const income = entry.tips || 0;
        const totalExpenses = (entry.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
        const net = income - totalExpenses;
        const hourlyRate = hours > 0 ? income / hours : 0;

        summaryHourlyRate.textContent = `${hourlyRate.toFixed(2)}€`;
        summaryIncome.textContent = `${income.toFixed(2)}€`;
        summaryExpenses.textContent = `${totalExpenses.toFixed(2)}€`;
        summaryNet.textContent = `${net.toFixed(2)}€`;

        // Color coding
        summaryNet.classList.toggle('positive', net > 0);
        summaryNet.classList.toggle('negative', net < 0);
    }

    function getEntriesForPeriod(startDate, endDate) {
        return Object.keys(currentData)
            .filter(date => date >= startDate && date <= endDate)
            .map(date => currentData[date]);
    }

    function calculateMonthlyTotals(year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0);
        const lastDay = String(endDate.getDate()).padStart(2, '0');
        const endDateStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

        const entries = getEntriesForPeriod(startDate, endDateStr);
        const totalIncome = entries.reduce((sum, entry) => sum + entry.tips, 0);
        const totalExpenses = entries.reduce((sum, entry) => sum + entry.expenses.reduce((s, e) => s + e.amount, 0), 0);

        const taxThreshold = 1050;
        const taxRate = 0.20;
        const tax = totalIncome > taxThreshold ? (totalIncome - taxThreshold) * taxRate : 0;

        const netSavings = totalIncome - totalExpenses - tax;

        return { totalIncome, totalExpenses, tax, netSavings };
    }


    // --- Core Functions ---

    function getTodayDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function addExpenseRow(category = '', amount = '') {
        const expenseId = `expense-${Date.now()}`;
        const expenseRow = document.createElement('div');
        expenseRow.classList.add('expense-item');
        expenseRow.innerHTML = `
            <input type="text" class="expense-category" placeholder="Expense Category" value="${category}">
            <input type="number" class="expense-amount" placeholder="Amount" min="0" step="0.01" value="${amount}">
            <button type="button" class="remove-expense-btn" data-id="${expenseId}">&times;</button>
        `;
        expenseList.appendChild(expenseRow);

        expenseRow.querySelector('.remove-expense-btn').addEventListener('click', () => {
            expenseRow.remove();
            autoSave();
        });
    }

    function saveDataToLocalStorage() {
        localStorage.setItem('klagTrackData', JSON.stringify(currentData));
    }

    function loadDataFromLocalStorage() {
        const data = localStorage.getItem('klagTrackData');
        return data ? JSON.parse(data) : {};
    }

    function populateForm(entry) {
        hoursInput.value = entry.hours || '';
        tipsInput.value = entry.tips || '';
        notesInput.value = entry.notes || '';

        expenseList.innerHTML = '';
        if (entry.expenses && entry.expenses.length > 0) {
            entry.expenses.forEach(expense => addExpenseRow(expense.category, expense.amount));
        } else {
            addExpenseRow(); // Add one empty row if no expenses
        }
    }

    function loadEntryForDate(date) {
        const entry = currentData[date] || {};
        populateForm(entry);
        updateDailySummary(date);
    }

    function autoSave() {
        const date = dateInput.value;
        if (!date) return;

        const expenses = [];
        expenseList.querySelectorAll('.expense-item').forEach(item => {
            const category = item.querySelector('.expense-category').value.trim();
            const amount = parseFloat(item.querySelector('.expense-amount').value);
            if (category && amount > 0) {
                expenses.push({ category, amount });
            }
        });

        currentData[date] = {
            hours: parseFloat(hoursInput.value) || 0,
            tips: parseFloat(tipsInput.value) || 0,
            expenses: expenses,
            notes: notesInput.value.trim()
        };

        saveDataToLocalStorage();
        console.log("Data saved for", date);
        updateDailySummary(date);
    }

    // --- Event Listeners ---

    dailyForm.addEventListener('input', autoSave);

    addExpenseBtn.addEventListener('click', () => {
        addExpenseRow();
        // No need to call autoSave here as adding a row doesn't have data yet
    });

    presetExpensesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('preset-expense-btn')) {
            const category = e.target.dataset.category;
            const amount = e.target.dataset.amount;
            addExpenseRow(category, amount);
            autoSave();
        }
    });

    // --- Event Listeners ---
    dateInput.addEventListener('change', () => loadEntryForDate(dateInput.value));
    dailyForm.addEventListener('input', autoSave);

    addExpenseBtn.addEventListener('click', () => {
        addExpenseRow();
        // No need to call autoSave here as adding a row doesn't have data yet
    });

    presetExpensesContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('preset-expense-btn')) {
            const category = e.target.dataset.category;
            const amount = e.target.dataset.amount;
            addExpenseRow(category, amount);
            autoSave();
        }
    });

    // Overview Tab DOM Elements
    const overviewMonthIncome = document.getElementById('overview-month-income');
    const overviewMonthExpenses = document.getElementById('overview-month-expenses');
    const overviewMonthTaxable = document.getElementById('overview-month-taxable');
    const overviewMonthTax = document.getElementById('overview-month-tax');
    const overviewMonthNet = document.getElementById('overview-month-net');
    const overviewWeekIncome = document.getElementById('overview-week-income');
    const overviewWeekExpenses = document.getElementById('overview-week-expenses');
    const overviewWeekNet = document.getElementById('overview-week-net');
    const weeklyGoalInput = document.getElementById('weekly-goal');
    const setGoalBtn = document.getElementById('set-goal-btn');
    const weeklyProgressBar = document.getElementById('weekly-progress-bar');
    const weeklyProgressText = document.getElementById('weekly-progress-text');
    const chartContainer = document.getElementById('chart-container');

    let weeklyGoal = parseFloat(localStorage.getItem('klagTrackWeeklyGoal')) || 500;

    // --- Calculation Functions ---

    function calculateWeeklyTotals(year, week) {
        // This is a simplified week calculation. A more robust library like date-fns would be better.
        const d = new Date(year, 0, 1);
        const dayMs = 24 * 60 * 60 * 1000;
        const weekMs = 7 * dayMs;
        const start = d.getTime() + (week - 1) * weekMs - (d.getDay() * dayMs);
        const end = start + weekMs - dayMs;

        const startDate = new Date(start).toISOString().slice(0, 10);
        const endDate = new Date(end).toISOString().slice(0, 10);

        const entries = getEntriesForPeriod(startDate, endDate);
        const totalIncome = entries.reduce((sum, entry) => sum + entry.tips, 0);
        const totalExpenses = entries.reduce((sum, entry) => sum + entry.expenses.reduce((s, e) => s + e.amount, 0), 0);
        const net = totalIncome - totalExpenses;

        return { totalIncome, totalExpenses, net };
    }

    // --- UI Update Functions ---

    function updateOverviewTab() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        // Simple week number calculation
        const week = Math.ceil((now.getDate() + (new Date(year, 0, 1)).getDay()) / 7);

        // Update Monthly Summary
        const monthly = calculateMonthlyTotals(year, month);
        overviewMonthIncome.textContent = `${monthly.totalIncome.toFixed(2)}€`;
        overviewMonthExpenses.textContent = `${monthly.totalExpenses.toFixed(2)}€`;
        const taxableIncome = Math.max(0, monthly.totalIncome - 1050);
        overviewMonthTaxable.textContent = `${taxableIncome.toFixed(2)}€`;
        overviewMonthTax.textContent = `${monthly.tax.toFixed(2)}€`;
        overviewMonthNet.textContent = `${monthly.netSavings.toFixed(2)}€`;
        overviewMonthNet.classList.toggle('positive', monthly.netSavings > 0);
        overviewMonthNet.classList.toggle('negative', monthly.netSavings < 0);

        // Update Weekly Summary
        const weekly = calculateWeeklyTotals(year, week);
        overviewWeekIncome.textContent = `${weekly.totalIncome.toFixed(2)}€`;
        overviewWeekExpenses.textContent = `${weekly.totalExpenses.toFixed(2)}€`;
        overviewWeekNet.textContent = `${weekly.net.toFixed(2)}€`;
        overviewWeekNet.classList.toggle('positive', weekly.net > 0);
        overviewWeekNet.classList.toggle('negative', weekly.net < 0);

        // Update Goal Progress Bar
        weeklyGoalInput.value = weeklyGoal;
        const progress = weekly.totalIncome / weeklyGoal * 100;
        weeklyProgressBar.style.width = `${Math.min(100, progress)}%`;
        weeklyProgressText.textContent = `${weekly.totalIncome.toFixed(2)}€ / ${weeklyGoal.toFixed(2)}€`;

        // Update Chart
        renderMonthlyChart(year, month);
    }

    function renderMonthlyChart(year, month) {
        chartContainer.innerHTML = ''; // Clear previous chart
        const daysInMonth = new Date(year, month, 0).getDate();
        let maxIncome = 0;
        const dailyIncomes = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const income = (currentData[date] || {}).tips || 0;
            dailyIncomes.push(income);
            if (income > maxIncome) maxIncome = income;
        }

        if (maxIncome === 0) maxIncome = 100; // Avoid division by zero

        dailyIncomes.forEach((income, index) => {
            const barWrapper = document.createElement('div');
            barWrapper.classList.add('chart-bar-wrapper');

            const bar = document.createElement('div');
            bar.classList.add('chart-bar');
            bar.style.height = `${(income / maxIncome) * 100}%`;

            const tooltip = document.createElement('div');
            tooltip.classList.add('chart-tooltip');
            tooltip.textContent = `Day ${index + 1}: ${income.toFixed(2)}€`;

            barWrapper.appendChild(bar);
            barWrapper.appendChild(tooltip);
            chartContainer.appendChild(barWrapper);
        });
    }

    // --- UI Update Functions ---

    function updateHistoryTab() {
        const historyContainer = document.getElementById('history-list-container');
        historyContainer.innerHTML = ''; // Clear old content

        const entriesByMonth = {};
        for (const date in currentData) {
            const monthKey = date.substring(0, 7); // YYYY-MM
            if (!entriesByMonth[monthKey]) {
                entriesByMonth[monthKey] = [];
            }
            entriesByMonth[monthKey].push(currentData[date]);
        }

        const sortedMonths = Object.keys(entriesByMonth).sort().reverse();

        for (const monthKey of sortedMonths) {
            const [year, month] = monthKey.split('-').map(Number);
            const totals = calculateMonthlyTotals(year, month);

            const card = document.createElement('div');
            card.classList.add('history-card');

            const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

            card.innerHTML = `
                <h3>${monthName}</h3>
                <p>Total Income: <span class="positive">${totals.totalIncome.toFixed(2)}€</span></p>
                <p>Total Expenses: <span class="negative">${totals.totalExpenses.toFixed(2)}€</span></p>
                <p>Tax Paid: <span>${totals.tax.toFixed(2)}€</span></p>
                <p>Net Savings: <span class="${totals.netSavings >= 0 ? 'positive' : 'negative'}">${totals.netSavings.toFixed(2)}€</span></p>
            `;
            historyContainer.appendChild(card);
        }
    }

    // --- Core Functions ---

    // --- Event Listeners ---
    document.getElementById('export-data-btn').addEventListener('click', () => {
        const dataStr = JSON.stringify(currentData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `klagtrack_export_${getTodayDateString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    copyPrevDayBtn.addEventListener('click', () => {
        const currentDate = dateInput.value;
        if (!currentDate) return;

        const prevDate = new Date(currentDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().slice(0, 10);

        const prevEntry = currentData[prevDateStr];

        if (prevEntry) {
            populateForm(prevEntry);
            autoSave(); // Save the copied data to the current date
            alert(`Copied data from ${prevDateStr}`);
        } else {
            alert(`No data found for ${prevDateStr}`);
        }
    });

    navHistory.addEventListener('click', () => {
        showTab(historyTab);
        updateHistoryTab();
    });

    navOverview.addEventListener('click', () => {
        showTab(overviewTab);
        updateOverviewTab();
    });

    setGoalBtn.addEventListener('click', () => {
        const newGoal = parseFloat(weeklyGoalInput.value);
        if (newGoal > 0) {
            weeklyGoal = newGoal;
            localStorage.setItem('klagTrackWeeklyGoal', weeklyGoal);
            updateOverviewTab(); // Refresh view with new goal
        }
    });

    // --- Theme Switcher ---
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const body = document.body;

    function applyTheme(theme) {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            themeToggleBtn.textContent = '☀️';
        } else {
            body.classList.remove('dark-mode');
            themeToggleBtn.textContent = '🌙';
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        const isDarkMode = body.classList.contains('dark-mode');
        const newTheme = isDarkMode ? 'light' : 'dark';
        localStorage.setItem('klagTrackTheme', newTheme);
        applyTheme(newTheme);
    });

    // --- Initialization ---

    function initialize() {
        const savedTheme = localStorage.getItem('klagTrackTheme') || 'light';
        applyTheme(savedTheme);

        weeklyGoalInput.value = weeklyGoal;
        currentData = loadDataFromLocalStorage();
        dateInput.value = getTodayDateString();
        loadEntryForDate(dateInput.value);
        showTab(todayTab);
    }

    initialize();
});
