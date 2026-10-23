let prendasAdmin = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarInventario();

  // Vista previa al seleccionar imagen
  const inputFoto = document.getElementById("foto");
  inputFoto.addEventListener("change", previewImagen);

  // Drag and drop visual
  const uploadZone = document.getElementById("uploadZone");
  uploadZone.addEventListener("dragover", (e) => { e.preventDefault(); uploadZone.style.borderColor = "#c9933b"; });
  uploadZone.addEventListener("dragleave", () => { uploadZone.style.borderColor = "#d1d5db"; });
  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = "#d1d5db";
    if (e.dataTransfer.files.length) {
      inputFoto.files = e.dataTransfer.files;
      previewImagen();
    }
  });

  // Guardar formulario
  document.getElementById("formPrenda").addEventListener("submit", registrarPrenda);
  document.getElementById("searchTable").addEventListener("input", filtrarTabla);
});

// Vista previa interactiva
function previewImagen() {
  const file = document.getElementById("foto").files[0];
  const placeholder = document.getElementById("uploadPlaceholder");
  const imgPreview = document.getElementById("imgPreview");

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imgPreview.src = e.target.result;
      imgPreview.style.display = "block";
      placeholder.style.display = "none";
    };
    reader.readAsDataURL(file);
  }
}

// Cargar inventario desde Supabase
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
    tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color: red;">Error: ${err.message}</td></tr>`;
  }
}

// Renderizar tabla
function renderizarTabla(lista) {
  const tbody = document.getElementById("inventoryBody");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">No hay prendas registradas.</td></tr>`;
    return;
  }

  lista.forEach(item => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><img src="${item.imagen_url}" class="thumb-img" alt="${item.nombre}" onerror="this.src='https://via.placeholder.com/45'"></td>
      <td><strong>${item.codigo_prenda}</strong></td>
      <td>
        <div style="font-weight: 600;">${item.nombre}</div>
        <small style="color: var(--text-muted);">${item.marca || 'Americana'} • Talla ${item.talla_etiqueta}</small>
      </td>
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

// Registrar nueva prenda con CÓDIGO AUTOMÁTICO
async function registrarPrenda(e) {
  e.preventDefault();
  const btn = document.getElementById("btnGuardar");
  btn.disabled = true;
  btn.innerText = "Subiendo y publicando...";

  try {
    const file = document.getElementById("foto").files[0];
    if (!file) throw new Error("Selecciona una fotografía para la prenda.");

    // Generar código automático secuencial/único: LE + 3 números aleatorios
    const codigoGenerado = "LE-" + Math.floor(100 + Math.random() * 900);

    // Subir imagen al Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
    const filePath = `prendas/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("prendas-le")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) throw new Error(`Error en Storage: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseClient.storage
      .from("prendas-le")
      .getPublicUrl(filePath);

    // Guardar en la tabla prendas (sin medidas_cm obligatorias)
    const nuevaPrenda = {
      codigo_prenda: codigoGenerado,
      categoria_mano: document.getElementById("categoriaMano").value,
      nombre: document.getElementById("nombre").value.trim(),
      tipo_prenda: document.getElementById("tipoPrenda").value,
      marca: document.getElementById("marca").value.trim() || "Americana",
      talla_etiqueta: document.getElementById("talla").value,
      precio: parseFloat(document.getElementById("precio").value),
      medidas_cm: "Disponible en puesto de feria",
      imagen_url: publicUrlData.publicUrl,
      estado: "disponible"
    };

    const { error: insertError } = await supabaseClient
      .from("prendas")
      .insert([nuevaPrenda]);

    if (insertError) throw new Error(`Error en BD: ${insertError.message}`);

    alert(`¡Prenda registrada con éxito con el código ${codigoGenerado}!`);
    document.getElementById("formPrenda").reset();
    document.getElementById("imgPreview").style.display = "none";
    document.getElementById("uploadPlaceholder").style.display = "flex";
    cargarInventario();
  } catch (err) {
    alert(`Ocurrió un error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.innerText = "Publicar Prenda";
  }
}

// Cambiar estado rápido
async function cambiarEstado(id, nuevoEstado) {
  try {
    const { error } = await supabaseClient
      .from("prendas")
      .update({ estado: nuevoEstado })
      .eq("id", id);

    if (error) throw error;

    const item = prendasAdmin.find(p => p.id === id);
    if (item) item.estado = nuevoEstado;
    actualizarKPIs(prendasAdmin);
  } catch (err) {
    alert(`Error al actualizar estado: ${err.message}`);
    cargarInventario();
  }
}

// Eliminar prenda
async function eliminarPrenda(id, codigo) {
  if (!confirm(`¿Eliminar la prenda ${codigo}?`)) return;

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
    alert(`Error: ${err.message}`);
  }
}

function actualizarKPIs(lista) {
  document.getElementById("kpiTotal").innerText = lista.length;
  document.getElementById("kpiDisponibles").innerText = lista.filter(p => p.estado === 'disponible').length;
  document.getElementById("kpiReservadas").innerText = lista.filter(p => p.estado === 'reservado').length;
  document.getElementById("kpiVendidas").innerText = lista.filter(p => p.estado === 'vendido').length;
}

function filtrarTabla() {
  const q = document.getElementById("searchTable").value.toLowerCase().trim();
  const filtrados = prendasAdmin.filter(p => 
    p.codigo_prenda.toLowerCase().includes(q) ||
    p.nombre.toLowerCase().includes(q) ||
    (p.marca && p.marca.toLowerCase().includes(q))
  );
  renderizarTabla(filtrados);
}