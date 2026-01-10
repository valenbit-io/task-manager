import { useState, useEffect, useCallback } from 'react';
import { auth, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './Login';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Si estamos en Vercel usa la nube, si no, usa mi compu
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargandoUsuario, setCargandoUsuario] = useState(true);
  
  // LOGICA INVITADO
  const [modoInvitado, setModoInvitado] = useState(false);
  const [invitadoId, setInvitadoId] = useState(""); 

  const [modoOscuro, setModoOscuro] = useState(() => {
    if (window.localStorage.getItem('theme') === 'dark') return true;
    return false;
  });

  const [tareas, setTareas] = useState([]);
  const [recargar, setRecargar] = useState(false);
  
  // ERRORES Y FILTROS
  const [mensajeError, setMensajeError] = useState(""); 
  const [busqueda, setBusqueda] = useState(""); 
  const [filtroPrioridad, setFiltroPrioridad] = useState("Todas");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");

  // ESTADOS UI MEJORADA
  const [seleccionadas, setSeleccionadas] = useState([]);
  const [modoSeleccion, setModoSeleccion] = useState(false); 
  const [menuAbiertoId, setMenuAbiertoId] = useState(null); 
  const [menuBorradoAbierto, setMenuBorradoAbierto] = useState(false);

  // MODAL
  const [modal, setModal] = useState({
    abierto: false,
    tipo: null, 
    idTarea: null,
    textoInput: "",
    fechaInput: "",
    prioridadInput: "Media",
    categoriaInput: "General",
    mensajeConfirmacion: "",
    datosExtra: null
  });

  useEffect(() => {
    if (modoOscuro) {
      document.documentElement.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
    }
  }, [modoOscuro]);

  const toggleModoOscuro = () => setModoOscuro(!modoOscuro);

  useEffect(() => {
      const handleClickFuera = () => {
          setMenuAbiertoId(null);
          setMenuBorradoAbierto(false);
      };
      if (menuAbiertoId || menuBorradoAbierto) {
          document.addEventListener('click', handleClickFuera);
      }
      return () => document.removeEventListener('click', handleClickFuera);
  }, [menuAbiertoId, menuBorradoAbierto]);

  const obtenerIdUsuario = useCallback(() => {
    if (usuario) return usuario.uid;
    if (modoInvitado) return invitadoId; 
    return null;
  }, [usuario, modoInvitado, invitadoId]);

  // --- EFECTO DE AUTENTICACIÓN (Aquí limpiamos si se va el usuario) ---
  useEffect(() => {
    const suscripcion = onAuthStateChanged(auth, (u) => {
      setUsuario(u ? u : null);
      if (!u) setTareas([]); // <--- ¡AQUÍ ES EL LUGAR SEGURO PARA LIMPIAR!
      setModoInvitado(false);
      setCargandoUsuario(false);
    });
    return () => suscripcion();
  }, []);

  // --- EFECTO DE CARGA DE TAREAS (Solo busca, ya no limpia) ---
  useEffect(() => {
    const userId = obtenerIdUsuario();
    if (userId) {
      const obtenerTareas = async () => {
        try {
            const res = await fetch(`${API_URL}/tareas?usuarioId=${userId}`);
            const datos = await res.json();
            setTareas(Array.isArray(datos) ? datos : []);
        } catch (error) { 
            console.error(error);
            setTareas([]);
        }
      };
      obtenerTareas();
    }
    // Eliminamos el 'else' que causaba el error.
    // Si no hay userId, no hacemos nada (la limpieza ya la hizo el efecto de Auth o el botón salir).
  }, [recargar, obtenerIdUsuario]);

  const esVencida = (fecha) => {
      if (!fecha) return false;
      const hoy = new Date(); hoy.setHours(0,0,0,0); const fechaTarea = new Date(fecha); return fechaTarea < hoy;
  };

  const handleOnDragEnd = async (result) => {
    if (!result.destination || modoSeleccion) return; 
    const items = Array.from(tareas);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setTareas(items);
    const tareasParaActualizar = items.map((tarea, index) => ({ _id: tarea._id, orden: index }));
    try {
        await fetch(`${API_URL}/tareas/reordenar/lista`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tareas: tareasParaActualizar })
        });
    } catch (error) { console.error("Error al guardar orden:", error); }
  };

  const totalTareas = tareas.length;
  const tareasCompletadas = tareas.filter(t => t.completada).length;
  const porcentaje = totalTareas === 0 ? 0 : Math.round((tareasCompletadas / totalTareas) * 100);

  const obtenerMensajeProgreso = () => {
      if (totalTareas === 0) return "¡Lista vacía! Relájate 🍃";
      if (porcentaje === 100) return "¡Todo listo! Eres una máquina 🏆";
      if (porcentaje >= 50) return "¡Ya pasaste la mitad! 🚀";
      return "Vamos a empezar 💪";
  };

  const tareasFiltradas = tareas.filter((tarea) => {
      const coincideTexto = tarea.titulo.toLowerCase().includes(busqueda.toLowerCase());
      const coincidePrioridad = filtroPrioridad === "Todas" || tarea.prioridad === filtroPrioridad;
      const coincideCategoria = filtroCategoria === "Todas" || (tarea.categoria || "General") === filtroCategoria;
      return coincideTexto && coincidePrioridad && coincideCategoria;
  });

  const filtrosActivos = busqueda !== "" || filtroPrioridad !== "Todas" || filtroCategoria !== "Todas";

  const activarModoSeleccion = () => { setModoSeleccion(true); setSeleccionadas([]); };
  const cancelarModoSeleccion = () => { setModoSeleccion(false); setSeleccionadas([]); };

  const solicitarBorradoSeleccion = () => {
      if(!seleccionadas.length) return;
      setModal({ ...modal, abierto: true, tipo: 'borrar-seleccion', mensajeConfirmacion: `¿Eliminar ${seleccionadas.length} tareas?` });
  };

  const solicitarBorradoRapido = (tipo) => {
      let tareasABorrar = [];
      let mensaje = "";
      if (tipo === 'completadas') { tareasABorrar = tareas.filter(t => t.completada); mensaje = `¿Eliminar completadas (${tareasABorrar.length})?`; } 
      else if (tipo === 'vencidas') { tareasABorrar = tareas.filter(t => esVencida(t.fechaLimite) && !t.completada); mensaje = `¿Eliminar vencidas (${tareasABorrar.length})?`; } 
      else if (tipo === 'todas') { tareasABorrar = tareas; mensaje = `⚠️ ¿Eliminar TODAS las tareas?`; }

      if (tareasABorrar.length === 0) {
          setMensajeError(`No hay tareas ${tipo} para borrar.`);
          setTimeout(() => setMensajeError(""), 3000);
          setMenuBorradoAbierto(false);
          return;
      }
      setModal({ ...modal, abierto: true, tipo: 'borrar-auto', mensajeConfirmacion: mensaje, datosExtra: tareasABorrar });
      setMenuBorradoAbierto(false);
  };

  const toggleSeleccion = (id) => {
      if(seleccionadas.includes(id)) setSeleccionadas(seleccionadas.filter(item => item !== id));
      else setSeleccionadas([...seleccionadas, id]);
  };

  const toggleMenuBorrado = (e) => { e.stopPropagation(); setMenuBorradoAbierto(!menuBorradoAbierto); };

  const apiEditar = async (id, nuevoTexto, nuevaFechaEditada, nuevaPrioridadEditada, nuevaCategoriaEditada) => {
    const fechaConHora = nuevaFechaEditada ? nuevaFechaEditada + "T12:00:00" : "";
    await fetch(`${API_URL}/tareas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nuevoTexto, fechaLimite: fechaConHora, prioridad: nuevaPrioridadEditada, categoria: nuevaCategoriaEditada })
    });
    setRecargar(!recargar);
  };

  // ESTA FUNCIÓN SE LLAMA DESDE EL MODAL PARA CREAR
  const agregarTareaDesdeModal = async () => {
    if (!modal.textoInput.trim()) return;
    
    const existeDuplicada = tareas.some((t) => {
        const tituloIgual = t.titulo.trim().toLowerCase() === modal.textoInput.trim().toLowerCase();
        return tituloIgual && t.prioridad === modal.prioridadInput && t.categoria === modal.categoriaInput;
    });

    if (existeDuplicada) {
        alert("⚠️ Ya existe una tarea similar.");
        return;
    }

    const userId = obtenerIdUsuario();
    const fechaConHora = modal.fechaInput ? modal.fechaInput + "T12:00:00" : "";

    await fetch(`${API_URL}/tareas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          titulo: modal.textoInput, 
          usuarioId: userId, 
          fechaLimite: fechaConHora, 
          prioridad: modal.prioridadInput, 
          categoria: modal.categoriaInput 
      })
    });
    setRecargar(!recargar);
    cerrarModal();
  };

  const toggleCompletada = async (id, estadoActual) => {
    if (modoSeleccion) return; 
    await fetch(`${API_URL}/tareas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completada: !estadoActual })
    });
    setRecargar(!recargar);
  };

  const confirmarBorradoUno = (id) => setModal({ ...modal, abierto: true, tipo: 'borrar-uno', idTarea: id });
  
  // ABRIR MODAL PARA CREAR
  const abrirModalCrear = () => {
      setModal({
          abierto: true,
          tipo: 'crear',
          idTarea: null,
          textoInput: "",
          fechaInput: "",
          prioridadInput: "Media",
          categoriaInput: "General"
      });
  };

  const iniciarEdicion = (id, textoActual, fechaActual, prioridadActual, categoriaActual) => {
    let fechaFormateada = "";
    if (fechaActual) fechaFormateada = new Date(fechaActual).toISOString().split('T')[0];
    setModal({ 
        abierto: true, 
        tipo: 'editar', 
        idTarea: id, 
        textoInput: textoActual, 
        fechaInput: fechaFormateada, 
        prioridadInput: prioridadActual || "Media",
        categoriaInput: categoriaActual || "General"
    });
  };
  
  const cerrarModal = () => setModal({ ...modal, abierto: false });
  
  const ejecutarAccionModal = async () => {
    if (modal.tipo === 'crear') {
        await agregarTareaDesdeModal();
    } else if (modal.tipo === 'borrar-uno') {
        await fetch(`${API_URL}/tareas/${modal.idTarea}`, { method: 'DELETE' });
        setRecargar(!recargar);
        cerrarModal();
    } else if (modal.tipo === 'editar' && modal.textoInput.trim() !== "") {
        await apiEditar(modal.idTarea, modal.textoInput, modal.fechaInput, modal.prioridadInput, modal.categoriaInput);
        cerrarModal();
    } else if (modal.tipo === 'borrar-seleccion') {
        await Promise.all(seleccionadas.map(id => fetch(`${API_URL}/tareas/${id}`, { method: 'DELETE' })));
        setRecargar(!recargar);
        cancelarModoSeleccion();
        cerrarModal();
    } else if (modal.tipo === 'borrar-auto') {
        const tareasParaBorrar = modal.datosExtra || [];
        await Promise.all(tareasParaBorrar.map(t => fetch(`${API_URL}/tareas/${t._id}`, { method: 'DELETE' })));
        setRecargar(!recargar);
        cerrarModal();
    }
  };

  const manejarSalir = () => { 
      // Limpiamos las tareas visualmente al salir
      setTareas([]); 
      
      if (modoInvitado) {
          setModoInvitado(false); 
      } else {
          logout(); 
      }
  };
  
  const obtenerColorBorde = (prioridad) => {
      if (prioridad === 'Alta') return 'border-l-4 border-l-red-500 dark:border-l-red-600';
      if (prioridad === 'Baja') return 'border-l-4 border-l-blue-400 dark:border-l-blue-500';
      return 'border-l-4 border-l-yellow-400 dark:border-l-yellow-500';
  };

  const obtenerEstiloCategoria = (cat) => {
      switch(cat) {
          case 'Trabajo': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
          case 'Personal': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
          case 'Estudio': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
          case 'Hogar': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
          default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
      }
  };

  const toggleMenu = (e, id) => { e.stopPropagation(); if (menuAbiertoId === id) setMenuAbiertoId(null); else setMenuAbiertoId(id); };

  if (cargandoUsuario) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 text-gray-800 dark:text-white">Cargando...</div>;
  if (!usuario && !modoInvitado) return <Login activarInvitado={() => { 
      setModoInvitado(true); 
      setInvitadoId(`guest_${Date.now()}_${Math.random()}`); // Generar ID único al entrar
  }} />;

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col items-center p-4 relative">
      
      {/* --- MODAL UNIFICADO --- */}
      {modal.abierto && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex justify-center items-center z-[100] transition-opacity p-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                    {modal.tipo === 'crear' ? 'Nueva Tarea' : modal.tipo === 'editar' ? 'Editar Tarea' : 'Confirmar'}
                </h3>
                
                {modal.tipo.startsWith('borrar') ? (
                    <div className="mb-6">
                        <div className="flex justify-center mb-4 text-4xl">🗑️</div>
                        <p className="text-center text-gray-600 dark:text-gray-300 font-medium">{modal.mensajeConfirmacion || "¿Estás seguro?"}</p>
                    </div>
                ) : (
                    // FORMULARIO DENTRO DEL MODAL
                    <div className="flex flex-col gap-4 mb-6">
                        <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Título</label><input autoFocus type="text" value={modal.textoInput} onChange={(e) => setModal({...modal, textoInput: e.target.value})} className="w-full border dark:border-gray-600 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white focus:outline-none text-lg font-medium" placeholder="Ej: Ir al gimnasio" /></div>
                        
                        <div className="flex gap-3">
                             <div className="w-1/2"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Categoría</label>
                                <select value={modal.categoriaInput} onChange={(e) => setModal({...modal, categoriaInput: e.target.value})} className="w-full border dark:border-gray-600 p-2 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none h-10">
                                    <option value="General">⚙️ General</option><option value="Trabajo">💼 Trabajo</option><option value="Personal">👤 Personal</option><option value="Estudio">📚 Estudio</option><option value="Hogar">🏠 Hogar</option>
                                </select>
                            </div>
                            <div className="w-1/2"><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Prioridad</label>
                                <select value={modal.prioridadInput} onChange={(e) => setModal({...modal, prioridadInput: e.target.value})} className="w-full border dark:border-gray-600 p-2 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none h-10">
                                    <option value="Alta">🔥 Alta</option><option value="Media">⚡ Media</option><option value="Baja">☕ Baja</option>
                                </select>
                            </div>
                        </div>
                         <div><label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase ml-1">Fecha Límite</label><input type="date" value={modal.fechaInput} onChange={(e) => setModal({...modal, fechaInput: e.target.value})} className="w-full border dark:border-gray-600 p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white focus:outline-none" /></div>
                    </div>
                )}
                
                <div className="flex gap-3 justify-end">
                    <button onClick={cerrarModal} className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm">Cancelar</button>
                    <button onClick={ejecutarAccionModal} className={`px-4 py-2 text-white rounded-lg font-bold shadow-md text-sm ${modal.tipo.startsWith('borrar') ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        {modal.tipo.startsWith('borrar') ? 'Sí, eliminar' : modal.tipo === 'crear' ? 'Crear Tarea' : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- CABECERA SUPERIOR --- */}
      <div className="w-full max-w-lg flex justify-between items-center mb-6 pt-2">
            <div className="flex items-center gap-3">{usuario?.photoURL ? <img src={usuario.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-indigo-500 shadow-sm" /> : <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">Inv</div>}
            <div><p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Hola,</p><h2 className="text-sm font-bold text-gray-800 dark:text-white">{usuario ? usuario.displayName : "Invitado"}</h2></div></div>
            <div className="flex items-center gap-2"><button onClick={toggleModoOscuro} className="p-2 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-yellow-400 shadow-sm hover:scale-105 transition">{modoOscuro ? "☀️" : "🌙"}</button><button onClick={manejarSalir} className="px-3 py-1 text-xs text-red-500 font-bold hover:bg-red-50 rounded-lg transition">Salir</button></div>
      </div>

      <div className="w-full max-w-lg relative transition-colors duration-300 pb-24">
        
        {/* PROGRESO */}
        <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-end mb-2"><span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{obtenerMensajeProgreso()}</span><span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{tareasCompletadas}/{totalTareas}</span></div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden"><div className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-700 ease-out" style={{ width: `${porcentaje}%` }}></div></div>
        </div>

        {/* BÚSQUEDA Y FILTROS */}
        <div className="mb-4 flex flex-col gap-2">
            <input type="text" placeholder="🔍 Buscar..." className="w-full bg-white dark:bg-gray-800 border-none p-3 rounded-xl shadow-sm text-sm focus:ring-2 focus:ring-indigo-200 dark:text-white transition placeholder-gray-400 dark:placeholder-gray-500" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            <div className="flex gap-2 w-full overflow-x-auto pb-1 no-scrollbar">
                <select className="bg-white dark:bg-gray-800 border-none px-3 py-2 rounded-lg shadow-sm text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer min-w-[100px]" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                    <option value="Todas">📂 Todas</option><option value="General">⚙️ General</option><option value="Trabajo">💼 Trabajo</option><option value="Personal">👤 Personal</option><option value="Estudio">📚 Estudio</option><option value="Hogar">🏠 Hogar</option>
                </select>
                <select className="bg-white dark:bg-gray-800 border-none px-3 py-2 rounded-lg shadow-sm text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer min-w-[100px]" value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)}>
                    <option value="Todas">📊 Prioridad</option><option value="Alta">🔥 Alta</option><option value="Media">⚡ Media</option><option value="Baja">☕ Baja</option>
                </select>
            </div>
        </div>

        {/* BARRA DE HERRAMIENTAS (Seleccionar / Borrar) */}
        {tareas.length > 0 && !mensajeError && (
             <div className="mb-4 flex justify-end animate-in fade-in duration-300">
                {!modoSeleccion ? (
                    <div className="flex gap-px shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <button onClick={activarModoSeleccion} className="text-gray-600 dark:text-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition font-bold text-xs flex items-center gap-1 rounded-l-lg">
                           <span>✨</span> Seleccionar
                        </button>
                        <div className="relative border-l border-gray-200 dark:border-gray-700">
                            <button onClick={toggleMenuBorrado} className="h-full px-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 transition font-bold text-xs rounded-r-lg">▼</button>
                            {menuBorradoAbierto && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-100 dark:border-gray-600 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                    <button onClick={() => solicitarBorradoRapido('completadas')} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">🧹 Borrar Completadas</button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700"></div>
                                    <button onClick={() => solicitarBorradoRapido('vencidas')} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">⏰ Borrar Vencidas</button>
                                    <div className="h-px bg-gray-100 dark:bg-gray-700"></div>
                                    <button onClick={() => solicitarBorradoRapido('todas')} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">💥 Borrar TODAS</button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-2 items-center bg-indigo-50 dark:bg-indigo-900/20 p-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in slide-in-from-right-4 shadow-sm">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 ml-2">{seleccionadas.length} seleccionadas</span>
                        <button onClick={cancelarModoSeleccion} className="text-xs text-gray-500 px-2 py-1 bg-white dark:bg-gray-700 rounded border hover:bg-gray-50">Cancelar</button>
                        {seleccionadas.length > 0 && (
                            <button onClick={solicitarBorradoSeleccion} className="text-xs text-white px-2 py-1 bg-red-500 rounded font-bold shadow-sm hover:bg-red-600">Borrar</button>
                        )}
                    </div>
                )}
             </div>
        )}

        {mensajeError && <div className="mb-6 text-center text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800 animate-pulse">{mensajeError}</div>}

        {tareas.length === 0 && !mensajeError && <div className="text-center py-20 opacity-70"><p className="text-6xl mb-4 animate-bounce">🍃</p><p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Todo limpio</p><p className="text-sm text-gray-400 mt-2">Pulsa + para empezar</p></div>}
        {tareas.length > 0 && tareasFiltradas.length === 0 && !mensajeError && <div className="text-center py-12 opacity-70"><p className="text-4xl mb-2">🔍</p><p className="text-gray-400 dark:text-gray-500 text-sm">No encontramos tareas.</p></div>}

        <DragDropContext onDragEnd={handleOnDragEnd}>
            {filtrosActivos || modoSeleccion ? (
               <ul className="space-y-3">
                  {tareasFiltradas.map((tarea) => (
                      <TareaItem key={tarea._id} tarea={tarea} toggleCompletada={toggleCompletada} iniciarEdicion={iniciarEdicion} confirmarBorrado={confirmarBorradoUno} esVencida={esVencida} obtenerColorBorde={obtenerColorBorde} obtenerEstiloCategoria={obtenerEstiloCategoria} seleccionadas={seleccionadas} toggleSeleccion={toggleSeleccion} modoSeleccion={modoSeleccion} menuAbiertoId={menuAbiertoId} toggleMenu={toggleMenu} />
                  ))}
               </ul>
            ) : (
               <Droppable droppableId="lista-tareas">
                   {(provided) => (
                       <ul className="space-y-3" {...provided.droppableProps} ref={provided.innerRef}>
                           {tareasFiltradas.map((tarea, index) => (
                               <Draggable key={tarea._id} draggableId={tarea._id} index={index}>
                                   {(provided) => (
                                       <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                           <TareaItem tarea={tarea} toggleCompletada={toggleCompletada} iniciarEdicion={iniciarEdicion} confirmarBorrado={confirmarBorradoUno} esVencida={esVencida} obtenerColorBorde={obtenerColorBorde} obtenerEstiloCategoria={obtenerEstiloCategoria} isDraggable={true} seleccionadas={seleccionadas} toggleSeleccion={toggleSeleccion} modoSeleccion={modoSeleccion} menuAbiertoId={menuAbiertoId} toggleMenu={toggleMenu} />
                                       </div>
                                   )}
                               </Draggable>
                           ))}
                           {provided.placeholder}
                       </ul>
                   )}
               </Droppable>
            )}
        </DragDropContext>

      </div>

      {/* --- BOTÓN FLOTANTE (FAB) PARA CREAR --- */}
      <button onClick={abrirModalCrear} className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl font-bold transition-transform hover:scale-110 active:scale-95 z-40 border-2 border-white dark:border-gray-800">
        +
      </button>

    </div>
  );
}

// COMPONENTE TAREA
function TareaItem({ tarea, toggleCompletada, iniciarEdicion, confirmarBorrado, esVencida, obtenerColorBorde, obtenerEstiloCategoria, isDraggable, seleccionadas, toggleSeleccion, modoSeleccion, menuAbiertoId, toggleMenu }) {
    const estaVencida = esVencida(tarea.fechaLimite) && !tarea.completada;
    const claseBorde = obtenerColorBorde(tarea.prioridad);
    const estaSeleccionada = seleccionadas.includes(tarea._id);
    const menuAbierto = menuAbiertoId === tarea._id;

    return (
        <li className={`group relative flex justify-between items-center p-4 rounded-xl shadow-sm border bg-white dark:bg-gray-800 dark:border-gray-700 transition-all ${claseBorde} ${tarea.completada && !modoSeleccion ? 'opacity-50 bg-gray-50 dark:bg-gray-800/50 grayscale' : ''} ${estaSeleccionada ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : ''}`}>
            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                
                {modoSeleccion && (
                     <div onClick={() => toggleSeleccion(tarea._id)} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-colors ${estaSeleccionada ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700'}`}>
                        {estaSeleccionada && <span className="text-white text-sm font-bold">✓</span>}
                     </div>
                )}

                {!modoSeleccion && (
                    <button onClick={() => toggleCompletada(tarea._id, tarea.completada)} className={`min-w-[28px] h-7 rounded-full border-2 flex items-center justify-center transition-colors ${tarea.completada ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-500 hover:border-indigo-500'}`}>
                        {tarea.completada && <span className="text-white text-sm">✓</span>}
                    </button>
                )}

                <div className="flex flex-col flex-1">
                    <span onClick={() => !modoSeleccion && toggleCompletada(tarea._id, tarea.completada)} className={`text-lg sm:text-xl font-semibold truncate cursor-pointer select-none dark:text-white ${tarea.completada && !modoSeleccion ? 'line-through text-gray-400' : 'text-gray-800'}`}>{tarea.titulo}</span>
                    <div className="flex gap-2 items-center mt-1.5 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${obtenerEstiloCategoria(tarea.categoria || 'General')}`}>
                            {tarea.categoria || 'General'}
                        </span>
                        {tarea.fechaLimite && <span className={`text-xs font-medium flex items-center gap-1 ${estaVencida ? 'text-red-500 font-bold' : 'text-gray-400 dark:text-gray-500'}`}>{estaVencida ? '⚠️ Vencida:' : '📅'} {new Date(tarea.fechaLimite).toLocaleDateString()}</span>}
                    </div>
                </div>
            </div>

            {!modoSeleccion && (
                <div className="relative ml-2">
                    <button onClick={(e) => toggleMenu(e, tarea._id)} className="text-gray-300 hover:text-gray-600 dark:hover:text-gray-200 p-2 text-xl rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                        ⋮
                    </button>
                    {menuAbierto && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-600 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                            <button onClick={() => iniciarEdicion(tarea._id, tarea.titulo, tarea.fechaLimite, tarea.prioridad, tarea.categoria)} className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
                                ✏️ Editar
                            </button>
                            <div className="h-px bg-gray-100 dark:bg-gray-700"></div>
                            <button onClick={() => confirmarBorrado(tarea._id)} className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2">
                                🗑 Borrar
                            </button>
                        </div>
                    )}
                </div>
            )}
            
            {!modoSeleccion && isDraggable && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-20 cursor-grab active:cursor-grabbing">
                    :::
                </div>
            )}
        </li>
    );
}

export default App;