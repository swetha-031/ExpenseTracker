import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, getDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ✅ CORRECTED: Replace the placeholder config with your actual Firebase project config.
const firebaseConfig = {
    apiKey: "AIzaSyB9nMScTfZ-1x1URK_u97cPE96nlOU-zvw",
    authDomain: "expense-tracker-afc24.firebaseapp.com",
    projectId: "expense-tracker-afc24",
    storageBucket: "expense-tracker-afc24.firebasestorage.app",
    messagingSenderId: "83941365376",
    appId: "1:83941365376:web:6d7952bb0dc1f37fc9b865",
    measurementId: "G-WXG80M1DJP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM Elements
const tableBody = document.getElementById("report-table-body");
const salaryValEl = document.getElementById("salary-val");
const totalExpEl = document.getElementById("total-exp-val");
const remBalanceEl = document.getElementById("rem-balance-val");
const pdfBtn = document.getElementById("pdfBtn");
const excelBtn = document.getElementById("excelBtn");
const logoutBtn = document.getElementById("logoutBtn");

let expenses = [];
let salary = 0;
let budget = 0;

// Firebase Auth check
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        alert("No user detected. Please login first!");
        window.location.href = "login.html";
        return;
    }
    const uid = user.uid; // use Firebase Auth UID
    await loadReport(uid);
});

// Load Data
async function loadReport(uid) {
    expenses = [];
    // Load Expenses
    const expSnap = await getDocs(collection(db, "users", uid, "expenses"));
    expSnap.forEach(d => expenses.push(d.data()));
    // Load Salary & Budget
    const docSnap = await getDoc(doc(db, "users", uid, "settings", "userData"));
    if (docSnap.exists()) {
        const data = docSnap.data();
        salary = data.salary || 0;
        budget = data.budget || 0;
    }
    renderReport();
}

// Render Table & Totals
function renderReport() {
    tableBody.innerHTML = "";
    let totalExp = 0;
    expenses.forEach(exp => {
        const expDate = exp.date?.seconds
            ? new Date(exp.date.seconds * 1000).toISOString().split("T")[0]
            : exp.date; // fallback if string
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${expDate}</td><td>${exp.category}</td><td>${exp.amount}</td>`;
        tableBody.appendChild(tr);
        totalExp += parseFloat(exp.amount);
    });
    salaryValEl.innerText = salary;
    totalExpEl.innerText = totalExp.toFixed(2);
    remBalanceEl.innerText = (salary - totalExp).toFixed(2);
}

// PDF Download
pdfBtn.addEventListener("click", () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Expense Report", 10, 10);
    doc.text(`Salary: ${salary}`, 10, 20);
    doc.text(`Total Expenses: ${totalExpEl.innerText}`, 10, 30);
    doc.text(`Remaining Budget: ${remBalanceEl.innerText}`, 10, 40);
    let y = 50;
    expenses.forEach(exp => {
        const expDate = exp.date?.seconds
            ? new Date(exp.date.seconds * 1000).toISOString().split("T")[0]
            : exp.date;
        doc.text(`${expDate} - ${exp.category} - ₹${exp.amount}`, 10, y);
        y += 10;
    });
    doc.save("Expense_Report.pdf");
});

// Excel Download
excelBtn.addEventListener("click", () => {
    const dataForExcel = expenses.map(exp => {
        const expDate = exp.date?.seconds
            ? new Date(exp.date.seconds * 1000).toISOString().split("T")[0]
            : exp.date;
        return { Date: expDate, Category: exp.category, Amount: exp.amount };
    });
    const ws = XLSX.utils.json_to_sheet(dataForExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, "Expense_Report.xlsx");
});

// Logout
logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "login.html";
});