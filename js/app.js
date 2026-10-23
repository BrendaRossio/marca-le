let prendasData = [];
const NUMERO_WHATSAPP = "59177822881"; // Reemplaza con el número real de Bolivia

document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo();

  // Event Listeners para Filtros en Vivo
  document.getElementById("filterMano").addEventListener("change", aplicarFiltros);
  document.getElementById("filterTipo").addEventListener("change", aplicarFiltros);
  document.getElementById("inputSearch").addEventListener("input", aplicarFiltros);
  
  // Cerrar Modal
  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("productModal").style.display = "none";
  });
});

// Obtener prendas activas desde Supabase
async function cargarCatalogo() {
  const grid = document.getElementById("productsGrid");
  
  try {
    const { data, error } = await supabaseClient
      .from("prendas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    prendasData = data || [];
    renderizarPrendas(prendasData);
  } catch (err) {
    grid.innerHTML = `<p class="error-text">Error al cargar las prendas: ${err.message}</p>`;
  }
}

// Dibujar las tarjetas en la grilla
function renderizarPrendas(lista) {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No se encontraron prendas con los criterios seleccionados.</p>`;
    return;
  }

  lista.forEach(item => {
    const card = document.createElement("div");
    card.className = "card-product";

    // Mensaje automático para WhatsApp
    const mensajeWS = encodeURIComponent(
      `¡Hola Marca LE! Estoy interesado en la prenda única:\n` +
      `Código: ${item.codigo_prenda}\n` +
      `Prenda: ${item.nombre}\n` +
      `Talla: ${item.talla_etiqueta}\n` +
      `Precio: ${item.precio} Bs.\n` +
      `¿Sigue disponible para coordinar la entrega o verla en la feria?`
    );

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${item.imagen_url}" alt="${item.nombre}" loading="lazy">
        <span class="badge-mano badge-${item.categoria_mano}">${item.categoria_mano} Mano</span>
        <span class="badge-estado">${item.estado.toUpperCase()}</span>
      </div>
      <div class="card-details">
        <span class="card-code">${item.codigo_prenda} • ${item.marca || 'Marca Americana'}</span>
        <h4 class="card-title">${item.nombre}</h4>
        <p class="card-meta">Talla: <strong>${item.talla_etiqueta}</strong> | Tipo: ${item.tipo_prenda}</p>
        <p class="card-price">${parseFloat(item.precio).toFixed(2)} Bs.</p>
        <div class="card-actions">
          <button class="btn-card" onclick="abrirModalDetalle('${item.id}')">Ver Medidas</button>
          <a class="btn-ws" href="https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeWS}" target="_blank">Pedir por WhatsApp</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Filtros combinados
function aplicarFiltros() {
  const mano = document.getElementById("filterMano").value;
  const tipo = document.getElementById("filterTipo").value;
  const busqueda = document.getElementById("inputSearch").value.toLowerCase().trim();

  const filtrados = prendasData.filter(item => {
    const coincideMano = (mano === "todos" || item.categoria_mano === mano);
    const coincideTipo = (tipo === "todos" || item.tipo_prenda === tipo);
    const coincideTexto = (
      item.nombre.toLowerCase().includes(busqueda) ||
      (item.marca && item.marca.toLowerCase().includes(busqueda)) ||
      item.codigo_prenda.toLowerCase().includes(busqueda)
    );
    return coincideMano && coincideTipo && coincideTexto;
  });

  renderizarPrendas(filtrados);
}

// Modal Fit-Check con medidas en centímetros
function abrirModalDetalle(id) {
  const item = prendasData.find(p => p.id === id);
  if (!item) return;

  const modalBody = document.getElementById("modalBody");
  modalBody.innerHTML = `
    <div style="display: flex; flex-wrap: wrap; gap: 20px; padding: 20px;">
      <div style="flex: 1; min-width: 250px;">
        <img src="${item.imagen_url}" style="width: 100%; border-radius: 6px;" alt="${item.nombre}">
      </div>
      <div style="flex: 1; min-width: 250px;">
        <span style="font-weight: bold; color: var(--accent-color);">${item.codigo_prenda}</span>
        <h3 style="margin: 5px 0;">${item.nombre}</h3>
        <p style="color: var(--text-muted); margin-bottom: 15px;">Marca: ${item.marca || 'Americana'}</p>
        
        <div style="background: #f1f3f5; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
          <h4 style="font-size: 0.9rem; margin-bottom: 6px;">📐 Medidas Reales con Cinta Métrica:</h4>
          <p style="font-size: 0.95rem; font-weight: 500;">${item.medidas_cm || 'Sin medidas especificadas'}</p>
          <small style="color: var(--text-muted);">*En ropa americana recomendamos comparar estas medidas con una prenda propia.</small>
        </div>

        <p style="font-size: 1.3rem; font-weight: bold; margin-bottom: 15px;">${parseFloat(item.precio).toFixed(2)} Bs.</p>
        <p style="font-size: 0.85rem; color: var(--text-muted);">Estado: <strong>${item.estado.toUpperCase()}</strong></p>
      </div>
    </div>
  `;
  document.getElementById("productModal").style.display = "flex";
}