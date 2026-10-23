let prendasAdmin = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarInventario();

  // Envío del Formulario
  const form = document.getElementById("formPrenda");
  form.addEventListener("submit", registrarPrenda);

  // Filtro de búsqueda en la tabla
  const searchInput = document.getElementById("searchTable");
  searchInput.addEventListener("input", filtrarTabla);
});

// 1. Cargar todas las prendas desde Supabase
async function cargarInventario() {
  const tbody = document.getElementById("inventoryBody");

  try {
    const { data, error } = await supabaseClient
      .from("prendas")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    prendasAdmin = data || [];
    actualizarKPIs(prendasAdmin);
    renderizarTabla(prendasAdmin);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: red;">Error: ${err.message}</td></tr>`;
  }
}

// 2. Renderizar filas de la tabla
function renderizarTabla(lista) {
  const tbody = document.getElementById("inventoryBody");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center">No hay prendas registradas con ese criterio.</td></tr>`;
    return;
  }

  lista.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><img src="${item.imagen_url}" class="thumb-img" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/44'"></td>
      <td><strong>${item.codigo_prenda}</strong></td>
      <td>
        <div style="font-weight: 600;">${item.nombre}</div>
        <small style="color: var(--text-muted);">${item.marca || 'Americana'} • Talla ${item.talla_etiqueta}</small>
      </td>
      <td><span style="text-transform: capitalize;">${item.categoria_mano}</span></td>
      <td><strong>${parseFloat(item.precio).toFixed(2)} Bs.</strong></td>
      <td>
        <select class="status-select" onchange="cambiarEstado('${item.id}', this.value)">
          <option value="disponible" ${item.estado === 'disponible' ? 'selected' : ''}>Disponible</option>
          <option value="reservado" ${item.estado === 'reservado' ? 'selected' : ''}>Reservado</option>
          <option value="vendido" ${item.estado === 'vendido' ? 'selected' : ''}>Vendido</option>
        </select>
      </td>
      <td>
        <button class="btn-del" onclick="eliminarPrenda('${item.id}', '${item.codigo_prenda}')">Eliminar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 3. Subir foto a Supabase Storage y registrar registro en BD
async function registrarPrenda(e) {
  e.preventDefault();
  const btn = document.getElementById("btnGuardar");
  btn.disabled = true;
  btn.innerText = "Subiendo imagen y registrando...";

  try {
    const file = document.getElementById("foto").files[0];
    if (!file) throw new Error("Debes seleccionar una imagen para la prenda.");

    // Nombre de archivo único
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `prendas/${fileName}`;

    // A. Subir imagen al bucket público 'prendas-le'
    const { error: uploadError } = await supabaseClient.storage
      .from("prendas-le")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw new Error(`Error en Storage: ${uploadError.message}`);

    // B. Obtener la URL pública de la imagen
    const { data: publicUrlData } = supabaseClient.storage
      .from("prendas-le")
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData.publicUrl;

    // C. Armar el objeto para insertar en la tabla
    const nuevaPrenda = {
      codigo_prenda: document.getElementById("codigo").value.trim().toUpperCase(),
      categoria_mano: document.getElementById("categoriaMano").value,
      nombre: document.getElementById("nombre").value.trim(),
      tipo_prenda: document.getElementById("tipoPrenda").value,
      marca: document.getElementById("marca").value.trim() || "Americana",
      talla_etiqueta: document.getElementById("talla").value,
      precio: parseFloat(document.getElementById("precio").value),
      medidas_cm: document.getElementById("medidas").value.trim(),
      imagen_url: publicUrl,
      estado: "disponible"
    };

    // D. Insertar en la base de datos
    const { error: insertError } = await supabaseClient
      .from("prendas")
      .insert([nuevaPrenda]);

    if (insertError) throw new Error(`Error en BD: ${insertError.message}`);

    alert("¡Prenda registrada y publicada con éxito en Marca LE!");
    document.getElementById("formPrenda").reset();
    cargarInventario();
  } catch (err) {
    alert(`Ocurrió un error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = "Guardar y Publicar Prenda";
  }
}

// 4. Cambiar estado rápido (Disponible / Reservado / Vendido)
async function cambiarEstado(id, nuevoEstado) {
  try {
    const { error } = await supabaseClient
      .from("prendas")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) throw error;

    // Actualizar en memoria local
    const item = prendasAdmin.find(p => p.id === id);
    if (item) item.estado = nuevoEstado;
    actualizarKPIs(prendasAdmin);
  } catch (err) {
    alert(`No se pudo actualizar el estado: ${err.message}`);
    cargarInventario();
  }
}

// 5. Eliminar prenda
async function eliminarPrenda(id, codigo) {
  const confirmacion = confirm(`¿Estás seguro de eliminar la prenda con código ${codigo}?`);
  if (!confirmacion) return;

  try {
    const { error } = await supabaseClient
      .from("prendas")
      .delete()
      .eq("id", id);

    if (error) throw error;

    prendasAdmin = prendasAdmin.filter(p => p.id !== id);
    actualizarKPIs(prendasAdmin);
    renderizarTabla(prendasAdmin);
  } catch (err) {
    alert(`Error al eliminar: ${err.message}`);
  }
}

// 6. Contadores métricos (KPIs)
function actualizarKPIs(lista) {
  document.getElementById("kpiTotal").innerText = lista.length;
  document.getElementById("kpiDisponibles").innerText = lista.filter(p => p.estado === 'disponible').length;
  document.getElementById("kpiReservadas").innerText = lista.filter(p => p.estado === 'reservado').length;
  document.getElementById("kpiVendidas").innerText = lista.filter(p => p.estado === 'vendido').length;
}

// 7. Búsqueda en vivo en la tabla
function filtrarTabla() {
  const q = document.getElementById("searchTable").value.toLowerCase().trim();
  const filtrados = prendasAdmin.filter(p => 
    p.codigo_prenda.toLowerCase().includes(q) ||
    p.nombre.toLowerCase().includes(q) ||
    (p.marca && p.marca.toLowerCase().includes(q))
  );
  renderizarTabla(filtrados);
}