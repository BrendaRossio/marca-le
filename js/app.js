let prendasData = [];
const NUMERO_WHATSAPP = "59177822881"; // Reemplaza con tu número o el de la tienda

document.addEventListener("DOMContentLoaded", () => {
  cargarCatalogo();

  document.getElementById("filterMano").addEventListener("change", aplicarFiltros);
  document.getElementById("filterTipo").addEventListener("change", aplicarFiltros);
  document.getElementById("inputSearch").addEventListener("input", aplicarFiltros);
});

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
    grid.innerHTML = `<p style="color:red; text-align:center;">Error al cargar prendas: ${err.message}</p>`;
  }
}

function renderizarPrendas(lista) {
  const grid = document.getElementById("productsGrid");
  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 20px;">No se encontraron prendas con esos filtros.</p>`;
    return;
  }

  lista.forEach(item => {
    const card = document.createElement("div");
    card.className = "card-product";

    const mensajeWS = encodeURIComponent(
      `¡Hola Marca LE! Quiero consultar por esta prenda:\n` +
      `Código: ${item.codigo_prenda}\n` +
      `Nombre: ${item.nombre}\n` +
      `Talla: ${item.talla_etiqueta}\n` +
      `Precio: ${item.precio} Bs.\n` +
      `¿Sigue disponible para verla o entrega?`
    );

    card.innerHTML = `
      <div class="card-image-wrapper">
        <img src="${item.imagen_url}" alt="${item.nombre}" loading="lazy">
        <span class="badge-mano badge-${item.categoria_mano}">${item.categoria_mano} Mano</span>
        <span class="badge-estado">${item.estado.toUpperCase()}</span>
      </div>
      <div class="card-details">
        <span class="card-code">${item.codigo_prenda} • ${item.marca || 'Americana'}</span>
        <h4 class="card-title">${item.nombre}</h4>
        <p class="card-meta">Talla: <strong>${item.talla_etiqueta}</strong> | Tipo: ${item.tipo_prenda}</p>
        <p class="card-price">${parseFloat(item.precio).toFixed(2)} Bs.</p>
        <div class="card-actions">
          <a class="btn-ws" href="https://wa.me/${NUMERO_WHATSAPP}?text=${mensajeWS}" target="_blank">📲 Pedir por WhatsApp</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

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