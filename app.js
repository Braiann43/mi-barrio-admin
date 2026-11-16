import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { firebaseConfig } from "./config.js";

const ADMIN_EMAIL = "admin@mibarrio.com";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let todosLosReportes = [];
let mapaUsuarios = {};
let usuarioSeleccionadoId = null;

// Elementos DOM
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const usersTbody = document.getElementById("users-tbody");
const usersView = document.getElementById("users-view");
const userReportsView = document.getElementById("user-reports-view");
const reportsGrid = document.getElementById("reports-grid");
const selectedUserTitle = document.getElementById("selected-user-title");

// Login Admin
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;

  if (email !== ADMIN_EMAIL) {
    loginError.textContent = "Esta cuenta no tiene permisos de administrador.";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = "Correo o contraseña incorrectos.";
  }
});

document.getElementById("logout-btn").addEventListener("click", () => signOut(auth));
document.getElementById("back-to-users").addEventListener("click", () => {
  usuarioSeleccionadoId = null;
  userReportsView.classList.add("hidden");
  usersView.classList.remove("hidden");
});

onAuthStateChanged(auth, (user) => {
  if (user && user.email === ADMIN_EMAIL) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    escucharBaseDeDatos();
  } else {
    dashboardSection.classList.add("hidden");
    loginSection.classList.remove("hidden");
  }
});

function escucharBaseDeDatos() {
  onSnapshot(collection(db, "usuarios"), (snap) => {
    mapaUsuarios = {};
    snap.forEach((d) => { mapaUsuarios[d.id] = d.data(); });
    renderizarTablaUsuarios();
  });

  onSnapshot(collection(db, "reportes"), (snap) => {
    todosLosReportes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderizarTablaUsuarios();
    if (usuarioSeleccionadoId) renderizarReportesDeUsuario(usuarioSeleccionadoId);
  });
}

function renderizarTablaUsuarios() {
  const agrupados = {};

  todosLosReportes.forEach((rep) => {
    const uid = rep.usuarioId || "anonimo";
    const infoUsuario = mapaUsuarios[uid] || {};
    const fechaMs = new Date(rep.fecha).getTime() || 0;

    if (!agrupados[uid]) {
      agrupados[uid] = {
        uid,
        nombre: infoUsuario.nombre || "Vecino",
        email: infoUsuario.email || rep.emailUsuario || "Sin correo",
        cantidad: 0,
        primerReporteMs: fechaMs,
        ultimoReporteMs: fechaMs,
      };
    }

    agrupados[uid].cantidad += 1;
    if (fechaMs < agrupados[uid].primerReporteMs) agrupados[uid].primerReporteMs = fechaMs;
    if (fechaMs > agrupados[uid].ultimoReporteMs) agrupados[uid].ultimoReporteMs = fechaMs;
  });

  const listaOrdenada = Object.values(agrupados).sort(
    (a, b) => a.primerReporteMs - b.primerReporteMs
  );

  if (listaOrdenada.length === 0) {
    usersTbody.innerHTML = `<tr><td colspan="5">Todavía no hay reportes cargados.</td></tr>`;
    return;
  }

  usersTbody.innerHTML = listaOrdenada
    .map((u) => {
      const f1 = new Date(u.primerReporteMs).toLocaleDateString("es-AR");
      const f2 = new Date(u.ultimoReporteMs).toLocaleDateString("es-AR");
      return `
        <tr>
          <td><strong>${u.nombre}</strong></td>
          <td>${u.email}</td>
          <td>${u.cantidad}</td>
          <td>${f1 === f2 ? f1 : `${f1} (Último: ${f2})`}</td>
          <td><button class="btn-ver" data-uid="${u.uid}">Ver reportes</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll(".btn-ver").forEach((btn) => {
    btn.addEventListener("click", () => {
      usuarioSeleccionadoId = btn.dataset.uid;
      renderizarReportesDeUsuario(usuarioSeleccionadoId);
      usersView.classList.add("hidden");
      userReportsView.classList.remove("hidden");
    });
  });
}

function renderizarReportesDeUsuario(uid) {
  const delUsuario = todosLosReportes
    .filter((r) => (r.usuarioId || "anonimo") === uid)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const infoUsuario = mapaUsuarios[uid] || {};
  const nombre = infoUsuario.nombre || "Vecino";
  const email = infoUsuario.email || delUsuario[0]?.emailUsuario || "";

  selectedUserTitle.textContent = email
    ? `Reportes de ${nombre} (${email})`
    : `Reportes de ${nombre}`;

  reportsGrid.innerHTML = delUsuario
    .map((rep) => {
      const estadoActual = rep.estado || "Pendiente";
      const fecha = new Date(rep.fecha).toLocaleString("es-AR");
      
      const imgHtml = rep.foto
        ? `<img src="${rep.foto}" alt="Foto reporte" style="width: 100%; height: 200px; object-fit: cover;" />`
        : `<div style="height:200px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#666;">Sin foto</div>`;

      const tipoReporte = rep.tipo || rep.categoria || "Incidente";
      const direccionTexto = rep.ubicacionTexto || (typeof rep.ubicacion === 'string' ? rep.ubicacion : "No especificada");

      return `
        <div class="report-card" style="border: 1px solid #ccc; border-radius: 8px; overflow: hidden; margin-bottom: 20px; background: #fff;">
          ${imgHtml}
          <div class="report-body" style="padding: 15px;">
            <small style="color: #666;">${fecha}</small>
            <h4 style="margin: 5px 0; color: #1877F2;">${tipoReporte}</h4>
            <p style="margin: 5px 0;"><strong>Ubicación:</strong> ${direccionTexto}</p>
            <p style="margin: 5px 0;"><strong>Antigüedad:</strong> ${rep.antiguedad || "-"}</p>
            <p style="margin: 10px 0; font-size: 14px; color: #444;">${rep.descripcion || ""}</p>
            <div class="status-controls" style="margin-top: 15px; display: flex; gap: 10px;">
              <select id="select-${rep.id}" style="flex: 1; padding: 5px;">
                <option value="Pendiente" ${estadoActual === "Pendiente" ? "selected" : ""}>Pendiente</option>
                <option value="En proceso" ${estadoActual === "En proceso" ? "selected" : ""}>En proceso</option>
                <option value="Solucionado" ${estadoActual === "Solucionado" ? "selected" : ""}>Solucionado</option>
              </select>
              <button onclick="guardarEstado('${rep.id}')">Guardar</button>
              <button class="btn-eliminar" onclick="eliminarReporte('${rep.id}')">Borrar</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

window.guardarEstado = async (reporteId) => {
  const nuevoEstado = document.getElementById(`select-${reporteId}`).value;
  try {
    await updateDoc(doc(db, "reportes", reporteId), { estado: nuevoEstado });
    alert(`Estado actualizado a "${nuevoEstado}".`);
  } catch (err) {
    console.error(err);
    alert("Error al actualizar el estado.");
  }
};

window.eliminarReporte = async (reporteId) => {
  if (!confirm("¿Estás seguro de que querés eliminar este reporte de forma permanente?")) return;
  try {
    await deleteDoc(doc(db, "reportes", reporteId));
    alert("Reporte eliminado correctamente.");
  } catch (err) {
    console.error(err);
    alert("Error al eliminar el reporte.");
  }
};