const { useState, useEffect, useRef } = React;

const TiempoProduccionApp = () => {
  // Estados principales
  const [operario, setOperario] = useState('');
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null);
  const [etapa, setEtapa] = useState('');
  const [etapaInfo, setEtapaInfo] = useState(null);
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [tiempoActual, setTiempoActual] = useState(new Date());
  const [cronometro, setCronometro] = useState(0);
  const [registros, setRegistros] = useState([]);
  const [enProceso, setEnProceso] = useState(false);
  const [enPausa, setEnPausa] = useState(false);
  const [pausas, setPausas] = useState([]);
  const [tiempoPausaActual, setTiempoPausaActual] = useState(null);
  const [motivoPausa, setMotivoPausa] = useState('');
  const [mostrarModalPausa, setMostrarModalPausa] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [resultadosFinales, setResultadosFinales] = useState(null);
  
  // Estados de datos
  const [operarios, setOperarios] = useState([]);
  const [ordenesPendientes, setOrdenesPendientes] = useState([]);
  const [etapasDisponibles, setEtapasDisponibles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoEtapas, setCargandoEtapas] = useState(false);
  const intervalRef = useRef(null);
  const pausaIntervalRef = useRef(null);

  // Configuración Airtable
  const config = {
    baseId: 'appxLN1eWmQtHtScK',
    token: 'patwsDQO9ESnSjoPm.f25ac0959b111660f0fe4bbe1a8f6475d5444999c0641e283cd050c84281b4e0',
    tables: {
      operarios: 'tbl1cnciEfyKNDmhE',
      ordenes: 'tblgL5ujfWZnG0Jtj',
      ejecucion: 'tblAmR2wbcZ56o60F',
      etapas: 'tblcg4CfbN36krPdC'
    }
  };

  // Motivos de pausa predefinidos
  const motivosPausa = [
    { id: 'personal', label: '🚻 Necesidades personales', tipo: 'operativa' },
    { id: 'refrigerio', label: '🍽️ Refrigerio/Almuerzo', tipo: 'operativa' },
    { id: 'mantenimiento', label: '🔧 Mantenimiento de equipo', tipo: 'operativa' },
    { id: 'material', label: '📦 Falta de material', tipo: 'operativa' },
    { id: 'electrica', label: '⚡ Falla eléctrica', tipo: 'operativa' },
    { id: 'temperatura', label: '🌡️ Cambio de temperatura', tipo: 'operativa' },
    { id: 'limpieza', label: '🧹 Limpieza no programada', tipo: 'operativa' },
    { id: 'cambio_turno', label: '👥 Cambio de turno/relevo', tipo: 'operativa' },
    { id: 'reunion', label: '📋 Reunión/Capacitación', tipo: 'administrativa' },
    { id: 'emergencia', label: '🏥 Emergencia médica', tipo: 'administrativa' },
    { id: 'llamada', label: '📞 Llamada urgente', tipo: 'administrativa' },
    { id: 'cambio_produccion', label: '🔄 Cambio de producción', tipo: 'administrativa' }
  ];

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
      const url = `https://api.airtable.com/v0/${config.baseId}/${config.tables.ordenes}?filterByFormula={Estado}='Pendiente'`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Órdenes recibidas:', data.records);
        console.log('Primer registro ejemplo:', data.records[0]?.fields);
        
        setOrdenesPendientes(data.records.map(record => ({
          id: record.id,
          ...record.fields
        })));
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    }
  };

  // Cargar etapas del producto seleccionado
  const cargarEtapas = async (producto) => {
    setCargandoEtapas(true);
    setEtapasDisponibles([]);
    
    try {
      const filterFormula = `AND({Producto}='${producto}',{Estado}='Activo')`;
      const url = `https://api.airtable.com/v0/${config.baseId}/${config.tables.etapas}?filterByFormula=${encodeURIComponent(filterFormula)}&sort[0][field]=Etapa%20Número`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const etapasData = data.records.map(record => ({
          id: record.id,
          etapaId: record.fields['Etapa ID'],
          nombre: record.fields['Etapa Nombre'],
          numero: record.fields['Etapa Número'],
          tiempoPromedio: record.fields['Tiempo Promedio (min)'] || 0,
          tiempoMinimo: record.fields['Tiempo Mínimo (min)'] || 0,
          tiempoMaximo: record.fields['Tiempo Máximo (min)'] || 0,
          unidad: record.fields['Unidad'] || 'Unidad'
        }));
        
        setEtapasDisponibles(etapasData);
      }
    } catch (error) {
      console.error('Error cargando etapas:', error);
    } finally {
      setCargandoEtapas(false);
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

  // Cargar etapas cuando se selecciona una orden
  useEffect(() => {
    if (ordenSeleccionada) {
      // Usar el nombre del producto que ya procesamos
      const productoNombre = ordenSeleccionada.ProductoNombre;
        
      if (productoNombre && productoNombre !== 'Sin producto') {
        cargarEtapas(productoNombre);
      }
    } else {
      setEtapasDisponibles([]);
      setEtapa('');
      setEtapaInfo(null);
    }
  }, [ordenSeleccionada]);

  // Actualizar información de etapa seleccionada
  useEffect(() => {
    if (etapa) {
      const info = etapasDisponibles.find(e => e.etapaId === etapa);
      setEtapaInfo(info);
    } else {
      setEtapaInfo(null);
    }
  }, [etapa, etapasDisponibles]);

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => {
      setTiempoActual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Cronómetro principal
  useEffect(() => {
    if (enProceso && tiempoInicio && !enPausa) {
      intervalRef.current = setInterval(() => {
        const ahora = new Date();
        const tiempoTotal = Math.floor((ahora - tiempoInicio) / 1000);
        const tiempoPausas = pausas.reduce((acc, pausa) => {
          const fin = pausa.horaFin || ahora;
          return acc + Math.floor((fin - pausa.horaInicio) / 1000);
        }, 0);
        setCronometro(tiempoTotal - tiempoPausas);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enProceso, tiempoInicio, enPausa, pausas]);

  // Calcular color del semáforo
  const calcularColorSemaforo = () => {
    if (!etapaInfo || !ordenSeleccionada || cronometro === 0) return 'gray';
    
    const tiempoEstimadoTotal = etapaInfo.tiempoPromedio * ordenSeleccionada.Cantidad;
    const porcentajeTranscurrido = (cronometro / 60) / tiempoEstimadoTotal * 100;
    
    if (porcentajeTranscurrido <= 90) return 'green';
    if (porcentajeTranscurrido <= 100) return 'yellow';
    return 'red';
  };

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
    setPausas([]);
    
    // Agregar registro temporal
    const nuevoRegistro = {
      id: Date.now(),
      fecha: ahora.toLocaleDateString('es-ES'),
      operario,
      producto: ordenSeleccionada.ProductoNombre || 'Sin producto',
      etapa: etapaInfo.nombre,
      etapaId: etapa,
      horaInicio: ahora.toLocaleTimeString('es-ES'),
      horaFin: null,
      duracion: 0,
      ordenId: ordenSeleccionada.id,
      cantidad: ordenSeleccionada.Cantidad,
      unidad: ordenSeleccionada.Unidad
    };
    
    setRegistros(prev => [...prev, nuevoRegistro]);
  };

  // Pausar tiempo
  const iniciarPausa = () => {
    setMostrarModalPausa(true);
  };

  const confirmarPausa = () => {
    if (!motivoPausa) {
      alert('⚠️ Selecciona un motivo de pausa');
      return;
    }
    
    const ahora = new Date();
    const nuevaPausa = {
      id: Date.now(),
      motivo: motivoPausa,
      motivoTexto: motivosPausa.find(m => m.id === motivoPausa)?.label || '',
      horaInicio: ahora,
      horaFin: null
    };
    
    setPausas(prev => [...prev, nuevaPausa]);
    setEnPausa(true);
    setTiempoPausaActual(ahora);
    setMostrarModalPausa(false);
    setMotivoPausa('');
  };

  // Reanudar después de pausa
  const reanudar = () => {
    const ahora = new Date();
    setPausas(prev => prev.map(pausa => {
      if (!pausa.horaFin && pausa.id === pausas[pausas.length - 1].id) {
        return { ...pausa, horaFin: ahora };
      }
      return pausa;
    }));
    setEnPausa(false);
    setTiempoPausaActual(null);
  };

  // Finalizar cronómetro
  const finalizarTiempo = async () => {
    if (!enProceso) return;
    
    const ahora = new Date();
    const duracionSegundos = cronometro;
    const duracionMinutos = duracionSegundos / 60;
    
    // Calcular métricas
    const tiempoEstimadoTotal = etapaInfo.tiempoPromedio * ordenSeleccionada.Cantidad;
    const diferencia = duracionMinutos - tiempoEstimadoTotal;
    const porcentajeDiferencia = (diferencia / tiempoEstimadoTotal) * 100;
    
    const resultados = {
      duracionMinutos: duracionMinutos.toFixed(2),
      tiempoEstimado: tiempoEstimadoTotal.toFixed(2),
      diferencia: diferencia.toFixed(2),
      porcentajeDiferencia: porcentajeDiferencia.toFixed(1),
      esMejor: diferencia < 0,
      pausas: pausas.length,
      tiempoPausas: pausas.reduce((acc, pausa) => {
        const fin = pausa.horaFin || ahora;
        return acc + Math.floor((fin - pausa.horaInicio) / 1000);
      }, 0)
    };
    
    setResultadosFinales(resultados);
    setMostrarResultados(true);
    
    // Actualizar registro local
    setRegistros(prev => prev.map(reg => {
      if (reg.id === registros[registros.length - 1].id) {
        return {
          ...reg,
          horaFin: ahora.toLocaleTimeString('es-ES'),
          duracion: duracionMinutos,
          resultados
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
              'Duracion_Real': Math.round(duracionMinutos),
              'Estado_Etapa': 'Completada',
              'Cantidad_Producida': ordenSeleccionada.Cantidad,
              'Tiempo_Estimado': tiempoEstimadoTotal,
              'Porcentaje_Eficiencia': Math.round(100 - Math.abs(porcentajeDiferencia)),
              'Numero_Pausas': pausas.length,
              'Tiempo_Total_Pausas': Math.round(resultados.tiempoPausas / 60),
              'Detalle_Pausas': JSON.stringify(pausas.map(p => ({
                motivo: p.motivoTexto,
                duracion: p.horaFin ? Math.round((p.horaFin - p.horaInicio) / 60000) : 0
              })))
            }
          }]
        })
      });
    } catch (error) {
      console.error('Error guardando:', error);
      alert('❌ Error al guardar. El registro se mantiene localmente.');
    }
    
    // Resetear
    setEnProceso(false);
    setTiempoInicio(null);
    setEtapa('');
    setEtapaInfo(null);
    setPausas([]);
    setCronometro(0);
    
    // Recargar datos
    await Promise.all([cargarOperarios(), cargarOrdenes()]);
  };

  // Cerrar modal de resultados
  const cerrarResultados = () => {
    setMostrarResultados(false);
    setResultadosFinales(null);
  };

  // Exportar CSV
  const exportarCSV = () => {
    const headers = ['Fecha', 'Operario', 'Producto', 'Etapa', 'Cantidad', 'Inicio', 'Fin', 'Duración (min)', 'Tiempo Estimado', '% Eficiencia', 'Pausas'];
    const rows = registros.map(r => [
      r.fecha, 
      r.operario, 
      r.producto, 
      r.etapa,
      `${r.cantidad} ${r.unidad}`,
      r.horaInicio, 
      r.horaFin || 'En proceso', 
      r.duracion ? r.duracion.toFixed(2) : '-',
      r.resultados ? r.resultados.tiempoEstimado : '-',
      r.resultados ? `${100 - Math.abs(parseFloat(r.resultados.porcentajeDiferencia))}%` : '-',
      r.resultados ? r.resultados.pausas : '-'
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
                  ✅ {operarios.length} operarios de producción cargados
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
                  {ordenesPendientes.map((orden) => {
                    // Formatear fecha
                    let fecha = orden.Fecha_Programada || orden.Fecha_Orden || 'Sin fecha';
                    if (fecha !== 'Sin fecha' && fecha.includes('-')) {
                      const [año, mes, dia] = fecha.split('-');
                      fecha = `${dia}/${mes}/${año}`;
                    }
                    
                    const producto = orden.ProductoNombre || 'Sin producto';
                    
                    return (
                      <option key={orden.id} value={orden.id}>
                        {fecha} - {producto} - {orden.Cantidad} {orden.Unidad}
                      </option>
                    );
                  })}
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
                  disabled={!ordenSeleccionada || enProceso || cargandoEtapas}
                >
                  <option value="">
                    {!ordenSeleccionada ? 'Primero selecciona una orden' : 
                     cargandoEtapas ? 'Cargando etapas...' : 'Selecciona etapa'}
                  </option>
                  {etapasDisponibles.map(e => (
                    <option key={e.etapaId} value={e.etapaId}>
                      {e.numero}. {e.nombre}
                    </option>
                  ))}
                </select>
                {etapaInfo && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                    <p>⏱️ Tiempo estimado: <strong>{(etapaInfo.tiempoPromedio * ordenSeleccionada.Cantidad).toFixed(1)} min</strong></p>
                    <p>📊 Para: {ordenSeleccionada.Cantidad} {ordenSeleccionada.Unidad}</p>
                    <p>🎯 Mejor tiempo: {(etapaInfo.tiempoMinimo * ordenSeleccionada.Cantidad).toFixed(1)} min</p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Estado */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Estado Actual</h3>
              
              <div className="text-center space-y-4">
                {/* Semáforo */}
                <div className="flex justify-center mb-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    calcularColorSemaforo() === 'green' ? 'bg-green-500' :
                    calcularColorSemaforo() === 'yellow' ? 'bg-yellow-500' :
                    calcularColorSemaforo() === 'red' ? 'bg-red-500' :
                    'bg-gray-300'
                  }`}>
                    <span className="text-white text-2xl font-bold">
                      {calcularColorSemaforo() === 'green' ? '✓' :
                       calcularColorSemaforo() === 'yellow' ? '!' :
                       calcularColorSemaforo() === 'red' ? '✗' : '•'}
                    </span>
                  </div>
                </div>
                
                <div className="text-5xl font-mono font-bold text-blue-600">
                  {formatearTiempo(cronometro)}
                </div>
                
                {enPausa && (
                  <div className="text-orange-500 font-semibold animate-pulse">
                    ⏸️ EN PAUSA - {motivosPausa.find(m => m.id === pausas[pausas.length - 1]?.motivo)?.label}
                  </div>
                )}
                
                {ordenSeleccionada && etapaInfo && (
                  <div className="bg-white p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Produciendo:</p>
                    <p className="font-semibold">
                      {ordenSeleccionada.ProductoNombre || 'Sin producto'}
                    </p>
                    <p className="text-sm">{ordenSeleccionada.Cantidad} {ordenSeleccionada.Unidad}</p>
                    <p className="text-sm text-gray-600 mt-2">Etapa: {etapaInfo.nombre}</p>
                  </div>
                )}
                
                <div className="flex gap-4 justify-center flex-wrap">
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
                    onClick={enPausa ? reanudar : iniciarPausa}
                    disabled={!enProceso}
                    className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                      !enProceso
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : enPausa
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-orange-500 hover:bg-orange-600 text-white'
                    }`}
                  >
                    {enPausa ? '▶️ Reanudar' : '⏸️ Pausar'}
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
                
                {pausas.length > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    Pausas realizadas: {pausas.length}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Pausa */}
        {mostrarModalPausa && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">Selecciona el motivo de pausa</h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="font-semibold text-gray-700 mt-2">Pausas Operativas</div>
                {motivosPausa.filter(m => m.tipo === 'operativa').map(motivo => (
                  <label key={motivo.id} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="motivoPausa"
                      value={motivo.id}
                      checked={motivoPausa === motivo.id}
                      onChange={(e) => setMotivoPausa(e.target.value)}
                      className="mr-3"
                    />
                    <span>{motivo.label}</span>
                  </label>
                ))}
                
                <div className="font-semibold text-gray-700 mt-4">Pausas Administrativas</div>
                {motivosPausa.filter(m => m.tipo === 'administrativa').map(motivo => (
                  <label key={motivo.id} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="radio"
                      name="motivoPausa"
                      value={motivo.id}
                      checked={motivoPausa === motivo.id}
                      onChange={(e) => setMotivoPausa(e.target.value)}
                      className="mr-3"
                    />
                    <span>{motivo.label}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={confirmarPausa}
                  className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600"
                >
                  Confirmar Pausa
                </button>
                <button
                  onClick={() => {
                    setMostrarModalPausa(false);
                    setMotivoPausa('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Resultados */}
        {mostrarResultados && resultadosFinales && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-semibold mb-4">📊 Resultados de la Etapa</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Tiempo Real:</span>
                  <span className="font-bold">{resultadosFinales.duracionMinutos} min</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span>Tiempo Estimado:</span>
                  <span className="font-bold">{resultadosFinales.tiempoEstimado} min</span>
                </div>
                
                <div className={`flex justify-between items-center p-3 rounded ${
                  resultadosFinales.esMejor ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span>Diferencia:</span>
                  <span className={`font-bold ${
                    resultadosFinales.esMejor ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {resultadosFinales.esMejor ? '-' : '+'}{Math.abs(resultadosFinales.diferencia)} min
                  </span>
                </div>
                
                <div className={`flex justify-between items-center p-3 rounded ${
                  resultadosFinales.esMejor ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <span>Porcentaje:</span>
                  <span className={`font-bold text-xl ${
                    resultadosFinales.esMejor ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {resultadosFinales.esMejor ? '-' : '+'}{Math.abs(resultadosFinales.porcentajeDiferencia)}%
                  </span>
                </div>
                
                {resultadosFinales.pausas > 0 && (
                  <>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Número de Pausas:</span>
                      <span className="font-bold">{resultadosFinales.pausas}</span>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span>Tiempo Total en Pausas:</span>
                      <span className="font-bold">{Math.round(resultadosFinales.tiempoPausas / 60)} min</span>
                    </div>
                  </>
                )}
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-lg font-semibold">
                    {resultadosFinales.esMejor ? 
                      '🎉 ¡Excelente trabajo! Superaste el tiempo estimado' : 
                      '💪 ¡Sigue mejorando! Puedes hacerlo mejor'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={cerrarResultados}
                className="w-full mt-6 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

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
                  <th className="border p-2 text-left">Cantidad</th>
                  <th className="border p-2 text-left">Inicio</th>
                  <th className="border p-2 text-left">Fin</th>
                  <th className="border p-2 text-left">Duración (min)</th>
                  <th className="border p-2 text-left">Eficiencia</th>
                </tr>
              </thead>
              <tbody>
                {registros.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="border p-4 text-center text-gray-500">
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
                      <td className="border p-2">{registro.cantidad} {registro.unidad}</td>
                      <td className="border p-2">{registro.horaInicio}</td>
                      <td className="border p-2">
                        {registro.horaFin || 
                          <span className="text-orange-500 font-semibold">En proceso...</span>
                        }
                      </td>
                      <td className="border p-2">{registro.duracion ? registro.duracion.toFixed(2) : '-'}</td>
                      <td className="border p-2">
                        {registro.resultados ? 
                          <span className={registro.resultados.esMejor ? 'text-green-600' : 'text-red-600'}>
                            {100 - Math.abs(parseFloat(registro.resultados.porcentajeDiferencia))}%
                          </span> : '-'
                        }
                      </td>
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
