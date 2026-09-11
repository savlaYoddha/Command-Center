export type MockTransaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  status: "posted" | "pending" | "failed";
};

export type MockTask = {
  id: string;
  number: string;
  title: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: string;
};

export type MockVehicle = {
  id: string;
  name: string;
  service: string;
  cost: number;
  mileage: number;
  date: string;
};

export type MockDocument = {
  id: string;
  name: string;
  type: string;
  category: string;
  date: string;
  size: string;
};

export const mockTransactions: MockTransaction[] = [
  { id: "tx-1", date: "2026-08-01", description: "Grocery run", category: "Food", amount: -2450, status: "posted" },
  { id: "tx-2", date: "2026-08-03", description: "Salary credit", category: "Income", amount: 125000, status: "posted" },
  { id: "tx-3", date: "2026-08-05", description: "Fuel", category: "Transport", amount: -3200, status: "posted" },
  { id: "tx-4", date: "2026-08-10", description: "Netflix", category: "Subscriptions", amount: -649, status: "pending" },
  { id: "tx-5", date: "2026-08-12", description: "Home loan EMI", category: "Loans", amount: -28500, status: "posted" },
  { id: "tx-6", date: "2026-08-15", description: "Freelance payout", category: "Income", amount: 18000, status: "posted" },
  { id: "tx-7", date: "2026-08-18", description: "Card payment failed", category: "Credit Card", amount: -12000, status: "failed" },
  { id: "tx-8", date: "2026-08-20", description: "Insurance", category: "Bills", amount: -8900, status: "posted" },
];

export const mockTasks: MockTask[] = [
  { id: "t-1", number: "TASK-001", title: "Replace homelab UPS battery", priority: "high", status: "In Progress" },
  { id: "t-2", number: "TASK-002", title: "Review finance export schema", priority: "medium", status: "Backlog" },
  { id: "t-3", number: "TASK-003", title: "Archive vehicle service receipts", priority: "low", status: "Done" },
];

export const mockVehicles: MockVehicle[] = [
  { id: "v-1", name: "Model Y", service: "Tire rotation", cost: 4200, mileage: 18420, date: "2026-07-12" },
  { id: "v-2", name: "City", service: "Oil change", cost: 2800, mileage: 42110, date: "2026-06-28" },
];

export const mockDocuments: MockDocument[] = [
  { id: "d-1", name: "Passport scan", type: "PDF", category: "Identity", date: "2026-01-10", size: "1.2 MB" },
  { id: "d-2", name: "Insurance policy", type: "PDF", category: "Insurance", date: "2025-11-02", size: "3.4 MB" },
];

export const mockActivity = [
  { id: "a-1", time: "08:30", title: "Task created", description: "TASK-014 initialized in backlog.", meta: "tasks" },
  { id: "a-2", time: "09:15", title: "Priority changed", description: "Priority set to HIGH.", meta: "tasks" },
  { id: "a-3", time: "10:20", title: "Moved to In Progress", description: "Column updated by operator.", meta: "tasks" },
  { id: "a-4", time: "12:45", title: "Comment added", description: "Waiting on vendor response.", meta: "tasks" },
];

export const mockUsers = ["Arun Krishna", "Ops Bot", "System"];

export const mockChartSpending = [
  { label: "Mar", value: 38500 },
  { label: "Apr", value: 41200 },
  { label: "May", value: 36800 },
  { label: "Jun", value: 44100 },
  { label: "Jul", value: 39500 },
  { label: "Aug", value: 42500 },
  { label: "Sep", value: 40200 },
  { label: "Oct", value: 45800 },
  { label: "Nov", value: 43100 },
  { label: "Dec", value: 47600 },
  { label: "Jan", value: 44900 },
  { label: "Feb", value: 46200 },
];

export const mockChartSpendingZoomLevels = [
  {
    id: "years",
    label: "Years",
    data: [
      { label: "2022", value: 412000 },
      { label: "2023", value: 468500 },
      { label: "2024", value: 501200 },
      { label: "2025", value: 524800 },
      { label: "2026", value: 198400 },
    ],
  },
  {
    id: "months",
    label: "Months",
    data: mockChartSpending,
  },
];

export const mockChartIncomeExpenses = [
  { label: "Mar", income: 118500, expenses: 72400 },
  { label: "Apr", income: 121000, expenses: 76800 },
  { label: "May", income: 119200, expenses: 70200 },
  { label: "Jun", income: 124500, expenses: 78400 },
  { label: "Jul", income: 122800, expenses: 75600 },
  { label: "Aug", income: 125000, expenses: 78400 },
  { label: "Sep", income: 123400, expenses: 74100 },
  { label: "Oct", income: 127800, expenses: 81200 },
  { label: "Nov", income: 124900, expenses: 77800 },
  { label: "Dec", income: 131200, expenses: 84500 },
  { label: "Jan", income: 126500, expenses: 79900 },
  { label: "Feb", income: 128400, expenses: 82100 },
];

export const mockChartCategories = [
  { label: "Food", value: 12450 },
  { label: "Transport", value: 8920 },
  { label: "Bills", value: 18600 },
  { label: "Shopping", value: 9800 },
  { label: "Entertainment", value: 4350 },
  { label: "Loans", value: 28500 },
];

export const mockChartCategoriesZoomLevels = [
  {
    id: "years",
    label: "Years",
    data: [
      { label: "Food", value: 148200 },
      { label: "Transport", value: 106800 },
      { label: "Bills", value: 221400 },
      { label: "Shopping", value: 117200 },
      { label: "Entertainment", value: 52100 },
      { label: "Loans", value: 341200 },
    ],
  },
  {
    id: "months",
    label: "Months",
    data: mockChartCategories,
  },
];

export const mockChartUtilization = [
  { label: "Credit Card", value: 68 },
  { label: "Home Loan", value: 42 },
  { label: "Vehicle Loan", value: 31 },
  { label: "Savings", value: 74 },
  { label: "Investments", value: 56 },
];

export const mockFiles = [
  { id: "f-1", name: "receipt-aug.pdf", size: "240 KB", meta: "Uploaded today" },
  { id: "f-2", name: "invoice-4421.png", size: "88 KB", meta: "Finance" },
];
