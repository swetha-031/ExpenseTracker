// Import Firebase SDKs (from CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc } 
    from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB9nMScTfZ-1x1URK_u97cPE96nlOU-zvw",
  authDomain: "expense-tracker-afc24.firebaseapp.com",
  projectId: "expense-tracker-afc24",
  storageBucket: "expense-tracker-afc24.firebasestorage.app",
  messagingSenderId: "83941365376",
  appId: "1:83941365376:web:6d7952bb0dc1f37fc9b865",
  measurementId: "G-WXG80M1DJP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Toast helper
function showToast(msg) { alert(msg); }

// Global data
let expenses = [];
let salary = 0;
let budget = 0;

// DOM elements
const tableBody = document.getElementById("expense-table-body");
const totalAmountEl = document.getElementById("total-amount");
const balanceAmountEl = document.getElementById("balance-amount");

// Load Expenses
async function loadExpenses(userId) {
  expenses = [];
  const querySnapshot = await getDocs(collection(db, "users", userId, "expenses"));
  querySnapshot.forEach(docSnap => expenses.push({ id: docSnap.id, ...docSnap.data() }));
  renderExpenses(expenses);
}

// Render Expenses Table
function renderExpenses(list) {
  tableBody.innerHTML = "";
  list.forEach(exp => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${exp.category}</td>
      <td>${exp.amount}</td>
      <td>${exp.date}</td>
      <td><button onclick="deleteExpense('${exp.id}')">Delete</button></td>`;
    tableBody.appendChild(tr);
  });
  const total = list.reduce((sum, e) => sum + e.amount, 0);
  totalAmountEl.innerText = total.toFixed(2);
  balanceAmountEl.innerText = (salary - total).toFixed(2);
  drawBarChart();
  drawPieChart();
}

// Delete Expense
window.deleteExpense = async function(id) {
  const user = auth.currentUser;
  if (!user) return;
  await deleteDoc(doc(db, "users", user.uid, "expenses", id));
  showToast("🗑 Expense deleted!");
  loadExpenses(user.uid);
};

// Add Expense
document.getElementById("add-btn").onclick = async () => {
  const cat = document.getElementById("category-select").value;
  const amt = parseFloat(document.getElementById("amount-input").value);
  const date = document.getElementById("date-input").value;
  if (!amt || !date) {
    showToast("⚠ Please enter amount and date!");
    return;
  }
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, "users", user.uid, "expenses"), { category: cat, amount: amt, date });
  showToast("✅ Expense added successfully!");
  loadExpenses(user.uid);
};

// Save Salary & Budget
document.getElementById("add-salary-btn").onclick = async () => {
  salary = parseFloat(document.getElementById("salary-input").value);
  budget = parseFloat(document.getElementById("budget-input").value);
  if (!salary || !budget) {
    showToast("⚠ Enter salary & budget.");
    return;
  }
  const user = auth.currentUser;
  if (!user) return;
  await setDoc(doc(db, "users", user.uid, "settings", "userData"), { salary, budget });
  showToast("✅ Salary & Budget saved!");
  loadExpenses(user.uid);
};

// Load Salary & Budget
async function loadSalaryBudget(userId) {
  const querySnapshot = await getDocs(collection(db, "users", userId, "settings"));
  querySnapshot.forEach(docSnap => {
    const data = docSnap.data();
    salary = data.salary || 0;
    budget = data.budget || 0;
  });
}

// Search Expenses
document.getElementById("search-input").addEventListener("input", e => {
  const text = e.target.value.toLowerCase();
  renderExpenses(expenses.filter(exp => exp.category.toLowerCase().includes(text)));
});

// Chart Drawing Functions
function drawBarChart() {
  const ctx = document.getElementById("bar-chart").getContext("2d");
  const data = {};
  expenses.forEach(e => { data[e.date] = (data[e.date] || 0) + e.amount; });
  const labels = Object.keys(data);
  const values = Object.values(data);
  if (window.barChartInstance) window.barChartInstance.destroy();
  window.barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Daily Expenses', data: values, backgroundColor: '#4caf50' }] },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  });
}

function drawPieChart() {
  const ctx = document.getElementById("expense-chart").getContext("2d");
  const data = {};
  expenses.forEach(e => { data[e.category] = (data[e.category] || 0) + e.amount; });
  const labels = Object.keys(data);
  const values = Object.values(data);
  const colors = ["#FF6384","#36A2EB","#FFCE56","#81C784","#BA68C8","#FF7043","#4DD0E1","#9575CD","#AED581","#F06292"];
  if (window.pieChartInstance) window.pieChartInstance.destroy();
  window.pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: { labels, datasets: [{ label: "Expense Category", data: values, backgroundColor: colors.slice(0, labels.length) }] },
    options: { responsive: true }
  });
}

// Chatbot Functions
const chatbotWindow = document.getElementById("chatbot-window");
const chatbotInput = document.getElementById("chatbot-input");
const chatbotSend = document.getElementById("chatbot-send");

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.classList.add("chat-message", sender === "user" ? "chat-user" : "chat-bot");
  div.innerText = text;
  chatbotWindow.appendChild(div);
  chatbotWindow.scrollTop = chatbotWindow.scrollHeight;
}

chatbotSend.addEventListener("click", () => {
  const msg = chatbotInput.value.trim();
  if (!msg) return;
  addMessage(msg, "user");
  chatbotInput.value = "";
  let reply = "🤖 Sorry, I didn't understand that.";
  if (/balance/i.test(msg)) reply = `💰 Balance: ₹${(salary - expenses.reduce((s,e)=>s+e.amount,0)).toFixed(2)}`;
  else if (/budget/i.test(msg)) reply = `📊 Budget: ₹${budget}`;
  else if (/expense|show/i.test(msg)) reply = expenses.length === 0 ? "📭 No expenses found!" : "📝 Recent Expenses:\n" + expenses.slice(-3).map(e=>`${e.category}: ₹${e.amount}`).join(", ");
  else if (/hello|hi/i.test(msg)) reply = "👋 Hello! How can I help with your expenses today?";
  setTimeout(() => addMessage(reply, "bot"), 500);
});

// Login Check
onAuthStateChanged(auth, async (user) => {
  if(user) {
    document.getElementById("profile-name").innerHTML=`Welcome, <strong>${user.email}</strong> 👋`;
    document.getElementById("profile-pic").src=`https://ui-avatars.com/api/?name=${user.email}&background=4CAF50&color=fff`;
    await loadSalaryBudget(user.uid);
    await loadExpenses(user.uid);
  } else {
    window.location.href="login.html";
  }
});

// Logout
window.logout = async function() { 
  await signOut(auth); 
  window.location.href="login.html"; 
}


// EmailJS Initialization and Email Reminder Integration
// EmailJS Initialization and Email Reminder Integration
emailjs.init("3oPdY4Xwd0Sp7MuYt");  // Your Public Key

document.getElementById("send-reminder").addEventListener("click", function() {
  var email = document.getElementById("user-email").value;
  var type = document.getElementById("reminder-type").value;
  
  if (!email) {
    document.getElementById("email-status").textContent = "Please enter your email address!";
    return;
  }

  // 📩 Parameters for Email Template
  var params = {
    to_email: email,        // matches your template variable {{to_email}}
    reminder_type: type,
    user_name: auth.currentUser ? auth.currentUser.email : "User", // optional dynamic name
    date: new Date().toLocaleDateString(), // send current date
  };

  // ✉ Send Email using EmailJS
  emailjs.send("service_ktn9eah", "template_78fhkvh", params)
    .then(function(response) {
      document.getElementById("email-status").textContent = "Reminder sent successfully!";
      showToast("📧 Email reminder sent successfully!");
    }, function(error) {
      document.getElementById("email-status").textContent = "Failed to send reminder: " + error.text;
      showToast("❌ Email reminder failed!");
    });
});
