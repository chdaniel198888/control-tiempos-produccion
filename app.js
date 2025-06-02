const { useState, useEffect, useRef } = React;

const TiempoProduccionApp = () => {
  // Estados principales
  const [operario, setOperario] = useState('');
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [etapa, setEtapa] = useState('');
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [tiempoActual, setTiempoActual] = useState(new Date());
  const [cronometro, setCronometro] = useState(0);
  const [registros, setRegistros] = useState([]);
  const [enProceso, setEnProceso] = useState(false);
  
  // Estados de datos
  const [operarios, setOperarios] = useState([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const intervalRef = useRef(null);

  // Configuración Airtable
  const config = {
    baseId: 'appzTllAjxu4TOs1a',
    token: 'patVNOhNd8sd7aFNf.ea0625015701b662df173fa067123aedb52f9dc6b769732c8886775e5c01cdd0',
    tables: {
      operarios: 'tbldYTLfQ3DoEK0WA',
      ordenes: 'tblMi5XRz5jqRdTdM',
      ejecucion: 'tblqRMzf8ECmJzBDj'
    }
  };

  // Etapas por producto (actualizado con TODOS los productos)
  const etapasPorProducto = {
    'HAMBURGUESA': ['PREPARACION DE UTENSILIOS', 'PESADO', 'MOLIDA', 'MEZCLADO/PORCIONADO/ENFUNDADO/APLASTADO', 'TIEMPO DE CONGELACIÓN', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'ZUMO DE FRESA': ['PREPARACION DE UTENSILIOS', 'PESADO Y LICUADO', 'PORCIONADO', 'EMPACADO PRIMARIO', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'SALSA VERDE': ['PREPARACION DE UTENSILIOS', 'MEZCLADO', 'PORCIONADO', 'LIMPIEZA DEL ÁREA'],
    'COSTILLA PAQ': ['PREPARACION DE UTENSILIOS', 'ALIÑADO', 'COCCION', 'PORCIONADO', 'EMPACADO', 'LIMPIEZA DEL ÁREA'],
    'ALIÑO PECHUGA': ['PREPARACION DE UTENSILIOS', 'PESADO Y PRODUCCIÓN', 'LIMPIEZA DEL ÁREA'],
    'JACK DANIEL': ['PREPARACION DE UTENSILIOS', 'SOFRITO DE CEBOLLA PAITEÑA Y AJO', 'LICUADO Y COCCIÓN', 'PORCIONADO', 'LIMPIEZA DEL ÁREA']
  };

  // Cargar operarios disponibles
  const cargarOperarios = async () => {
    try {
      const url = `https://api.airtable.com/v0/${config.baseId}/${config.tables.operarios}?filterByFormula={Cargo}='Operario de producción'&sort[0][field]=Nombre`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const operariosList = data.records.map(record => ({
          id: record.id,
          nombre: record.fields.Nombre || 'Sin nombre',
          codigo: record.fields['Código Trabajador'] || ''
        }));
        
        // Filtrar operarios que ya están trabajando
        const operariosDisponibles = operariosList.filter(op => 
          !registros.some(reg => reg.operario === op.nombre && !reg.horaFin)
        );
        
        setOperarios(operariosDisponibles);
      }
    } catch (error) {
      console.error('Error cargando operarios:', error);
    }
  };

  // Cargar órdenes de producción pendientes
  const cargarOrdenes = async () => {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      const url = `https://api.airtable.com/v0/${config.baseId}/${config.tables.ordenes}?filterByFormula=AND({Estado}='Pendiente',IS_SAME({Fecha_Produccion},'${hoy}','day'))`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrdenesPendientes(data.records.map(record => ({
          id: record.id,
          ...record.fields
        })));
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      await Promise.all([cargarOperarios(), cargarOrdenes()]);
      setCargando(false);
    };
    cargarDatos();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, [registros]);

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => {
      setTiempoActual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cronómetro
  useEffect(() => {
    if (enProceso && tiempoInicio) {
      intervalRef.current = setInterval(() => {
        const ahora = new Date();
        const diferencia = Math.floor((ahora - tiempoInicio) / 1000);
        setCronometro(diferencia);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setCronometro(0);
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enProceso, tiempoInicio]);

  // Formatear tiempo
  const formatearTiempo = (segundos) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  // Iniciar cronómetro
  const iniciarTiempo = () => {
    if (!operario || !ordenSeleccionada || !etapa) {
      alert('⚠️ Completa todos los campos antes de iniciar');
      return;
    }
    
    const ahora = new Date();
    setTiempoInicio(ahora);
    setEnProceso(true);
    
    // Agregar registro temporal
    const nuevoRegistro = {
      id: Date.now(),
      fecha: ahora.toLocaleDateString('es-ES'),
      operario,
      producto: ordenSeleccionada.Producto,
      etapa,
      horaInicio: ahora.toLocaleTimeString('es-ES'),
      horaFin: null,
      duracion: 0,
      ordenId: ordenSeleccionada.id
    };
    
    setRegistros(prev => [...prev, nuevoRegistro]);
  };

  // Finalizar cronómetro
  const finalizarTiempo = async () => {
    if (!enProceso) return;
    
    const ahora = new Date();
    const duracionMinutos = Math.round((ahora - tiempoInicio) / 1000 / 60);
    
    // Actualizar registro local
    setRegistros(prev => prev.map(reg => {
      if (reg.id === registros[registros.length - 1].id) {
        return {
          ...reg,
          horaFin: ahora.toLocaleTimeString('es-ES'),
          duracion: duracionMinutos
        };
      }
      return reg;
    }));
    
    // Guardar en Airtable
    try {
      await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.ejecucion}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Orden_Produccion': [ordenSeleccionada.id],
              'Etapa': etapa,
              'Operario': operario,
              'Hora_Inicio_Real': tiempoInicio.toISOString(),
              'Hora_Fin_Real': ahora.toISOString(),
              'Duracion_Real': duracionMinutos,
              'Estado_Etapa': 'Completada'
            }
          }]
        })
      });
      
      alert(`✅ Etapa completada en ${duracionMinutos} minutos`);
    } catch (error) {
      console.error('Error guardando:', error);
      alert('❌ Error al guardar. El registro se mantiene localmente.');
    }
    
    // Resetear
    setEnProceso(false);
    setTiempoInicio(null);
    setEtapa('');
    await cargarDatos();
  };

  // Exportar CSV
  const exportarCSV = () => {
    const headers = ['Fecha', 'Operario', 'Producto', 'Etapa', 'Inicio', 'Fin', 'Duración (min)'];
    const rows = registros.map(r => [
      r.fecha, r.operario, r.producto, r.etapa, 
      r.horaInicio, r.horaFin || 'En proceso', r.duracion
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registros_produccion_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl">⏳ Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-800">
              🕐 Control de Tiempos - Producción
            </h1>
            <div className="text-lg text-gray-600">
              {tiempoActual.toLocaleDateString('es-ES')} {tiempoActual.toLocaleTimeString('es-ES')}
            </div>
          </div>
        </div>

        {/* Panel de Control */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Registro de Actividad</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Operario */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Operario de Producción
                </label>
                <select
                  value={operario}
                  onChange={(e) => setOperario(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={enProceso}
                >
                  <option value="">Selecciona un operario</option>
                  {operarios.map((op) => (
                    <option key={op.id} value={op.nombre}>
                      {op.nombre} {op.codigo ? `(${op.codigo})` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-green-600 mt-1">
                  ✅ {operarios.length} operarios disponibles
                </p>
              </div>

              {/* Orden de Producción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orden de Producción
                </label>
                <select
                  value={ordenSeleccionada?.id || ''}
                  onChange={(e) => {
                    const orden = ordenesPendientes.find(o => o.id === e.target.value);
                    setOrdenSeleccionada(orden);
                    setEtapa('');
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={enProceso}
                >
                  <option value="">Selecciona una orden</option>
                  {ordenesPendientes.map((orden) => (
                    <option key={orden.id} value={orden.id}>
                      {orden.Producto} - {orden.Cantidad} {orden.Unidad} ({orden.Turno})
                    </option>
                  ))}
                </select>
              </div>

              {/* Etapa */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Etapa de Producción
                </label>
                <select
                  value={etapa}
                  onChange={(e) => setEtapa(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  disabled={!ordenSeleccionada || enProceso}
                >
                  <option value="">
                    {!ordenSeleccionada ? 'Primero selecciona una orden' : 'Selecciona etapa'}
                  </option>
                  {ordenSeleccionada && etapasPorProducto[ordenSeleccionada.Producto]?.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Panel Estado */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Estado Actual</h3>
              
              <div className="text-center space-y-4">
                <div className="text-5xl font-mono font-bold text-blue-600">
                  {formatearTiempo(cronometro)}
                </div>
                
                {ordenSeleccionada && (
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Produciendo:</p>
                    <p className="font-semibold">{ordenSeleccionada.Producto}</p>
                    <p className="text-sm">{ordenSeleccionada.Cantidad} {ordenSeleccionada.Unidad}</p>
                  </div>
                )}
                
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={iniciarTiempo}
                    disabled={enProceso || !operario || !ordenSeleccionada || !etapa}
                    className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                      enProceso || !operario || !ordenSeleccionada || !etapa
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    ▶️ Iniciar
                  </button>
                  
                  <button
                    onClick={finalizarTiempo}
                    disabled={!enProceso}
                    className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                      !enProceso
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                  >
                    ⏹️ Finalizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Historial */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">
              Historial de Registros ({registros.length})
            </h2>
            <button
              onClick={exportarCSV}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              📥 Exportar CSV
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2 text-left">Fecha</th>
                  <th className="border p-2 text-left">Operario</th>
                  <th className="border p-2 text-left">Producto</th>
                  <th className="border p-2 text-left">Etapa</th>
                  <th className="border p-2 text-left">Inicio</th>
                  <th className="border p-2 text-left">Fin</th>
                  <th className="border p-2 text-left">Duración (min)</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="border p-4 text-center text-gray-500">
                      No hay registros aún. ¡Comienza a registrar tiempos!
                    </td>
                  </tr>
                ) : (
                  registros.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50">
                      <td className="border p-2">{registro.fecha}</td>
                      <td className="border p-2">{registro.operario}</td>
                      <td className="border p-2">{registro.producto}</td>
                      <td className="border p-2">{registro.etapa}</td>
                      <td className="border p-2">{registro.horaInicio}</td>
                      <td className="border p-2">
                        {registro.horaFin || 
                          <span className="text-orange-500 font-semibold">En proceso...</span>
                        }
                      </td>
                      <td className="border p-2">{registro.duracion || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(<TiempoProduccionApp />, document.getElementById('root'));
