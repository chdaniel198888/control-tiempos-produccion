const { useState, useEffect } = React;

const TiempoProduccionApp = () => {
  const [operario, setOperario] = useState('');
  const [etapa, setEtapa] = useState('');
  const [producto, setProducto] = useState('');
  const [tiempoInicio, setTiempoInicio] = useState(null);
  const [tiempoActual, setTiempoActual] = useState(new Date());
  const [registros, setRegistros] = useState([]);
  const [enProceso, setEnProceso] = useState(false);
  const [operarios, setOperarios] = useState([]);
  const [cargandoOperarios, setCargandoOperarios] = useState(true);
  const [ordenesAsignadas, setOrdenesAsignadas] = useState([]);
  const [cargandoOrdenes, setCargandoOrdenes] = useState(false);

  // Productos y etapas reales
  const productosConEtapas = {
    'JACK DANIEL V3': ['PREPARACION DE UTENSILIOS', 'SOFRITO DE CEBOLLA PAITEÑA Y AJO', 'LICUADO Y COCCIÓN', 'PORCIONADO', 'LIMPIEZA DEL ÁREA'],
    'ZUMO DE FRESA': ['PREPARACION DE UTENSILIOS', 'PESADO Y LICUADO', 'PORCIONADO', 'EMPACADO PRIMARIO', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'SALSA VERDE V2': ['PREPARACION DE UTENSILIOS', 'MEZCLADO', 'PORCIONADO', 'LIMPIEZA DEL ÁREA'],
    'ALIÑO PECHUGA': ['PREPARACION DE UTENSILIOS', 'PESADO Y PRODUCCIÓN', 'LIMPIEZA DEL ÁREA'],
    'HAMBURGUESA V6': ['PREPARACION DE UTENSILIOS', 'PESADO', 'MOLIDA', 'MEZCLADO/PORCIONADO/ENFUNDADO/APLASTADO', 'TIEMPO DE CONGELACIÓN', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'COSTILLAS PAQ': ['PREPARACION DE UTENSILIOS', 'ALIÑADO', 'COCCION', 'PORCIONADO', 'EMPACADO', 'LIMPIEZA DEL ÁREA'],
    'SALSA TARTARA': ['PREPARACION DE UTENSILIOS', 'PESADO Y PRODUCCIÓN', 'LIMPIEZA DEL ÁREA'],
    'HAMBURGUESA V4': ['PREPARACION DE UTENSILIOS', 'PESADO', 'MOLIDA', 'MEZCLADO/PORCIONADO/ENFUNDADO/APLASTADO', 'TIEMPO DE CONGELACIÓN', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA']
  };

  const productos = Object.keys(productosConEtapas);

  // Configuración Airtable
  const config = {
    baseId: 'appzTllAjxu4TOs1a',
    token: 'patVNOhNd8sd7aFNf.ea0625015701b662df173fa067123aedb52f9dc6b769732c8886775e5c01cdd0',
    operariosTableId: 'tbldYTLfQ3DoEK0WA',
    ordenesTableId: 'tblgL5ujfWZnG0Jtj',
    etapasTableId: 'tblAmR2wbcZ56o60F'
  };

  // Cargar operarios desde Airtable
  const cargarOperarios = async () => {
    try {
      setCargandoOperarios(true);
      
      const filterFormula = `{Cargo} = 'Operario de producción'`;
      const encodedFilter = encodeURIComponent(filterFormula);
      
      const url = `https://api.airtable.com/v0/${config.baseId}/${config.operariosTableId}?filterByFormula=${encodedFilter}&fields[]=Nombre&fields[]=Código Trabajador&sort[0][field]=Nombre&sort[0][direction]=asc`;
      
      console.log('🔄 Actualizando operarios desde Airtable...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.records && data.records.length > 0) {
          const operariosData = data.records.map(record => ({
            nombre: record.fields.Nombre || 'Sin nombre',
            codigo: record.fields['Código Trabajador'] || ''
          }));
          
          setOperarios(operariosData);
          console.log(`✅ ${operariosData.length} operarios actualizados desde Airtable`);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setCargandoOperarios(false);
    }
  };

  // Cargar órdenes asignadas al operario
  const cargarOrdenesAsignadas = async (nombreOperario) => {
    if (!nombreOperario) return;
    
    try {
      setCargandoOrdenes(true);
      
      const filterFormula = `AND({Operario_Asignado} = '${nombreOperario}', {Estado} = 'Pendiente')`;
      const encodedFilter = encodeURIComponent(filterFormula);
      
      const url = `https://api.airtable.com/v0/${config.baseId}/${config.ordenesTableId}?filterByFormula=${encodedFilter}`;
      
      console.log('🔄 Cargando órdenes asignadas...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrdenesAsignadas(data.records || []);
        console.log(`✅ ${data.records?.length || 0} órdenes cargadas`);
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error);
    } finally {
      setCargandoOrdenes(false);
    }
  };

  // Cargar operarios al inicio
  useEffect(() => {
    cargarOperarios();
  }, []);

  // Cargar órdenes cuando cambia el operario
  useEffect(() => {
    if (operario) {
      cargarOrdenesAsignadas(operario);
    }
  }, [operario]);

  // Reloj
  useEffect(() => {
    const timer = setInterval(() => {
      setTiempoActual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return React.createElement('div', {
    className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4"
  }, 
    React.createElement('div', { className: "max-w-6xl mx-auto" },
      React.createElement('div', { className: "bg-white rounded-xl shadow-lg p-6 mb-6" },
        React.createElement('div', { className: "flex items-center justify-between mb-6" },
          React.createElement('h1', { className: "text-3xl font-bold text-gray-800" }, 
            '🕐 Control de Tiempos - Producción'
          ),
          React.createElement('button', {
            onClick: cargarOperarios,
            disabled: cargandoOperarios,
            className: "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          },
            React.createElement('span', null, cargandoOperarios ? '🔄 Actualizando...' : '🔄 Actualizar Operarios')
          )
        ),
        React.createElement('div', { className: "grid lg:grid-cols-3 gap-6" },
          // Panel izquierdo - Selección
          React.createElement('div', { className: "space-y-4" },
            React.createElement('h2', { className: "text-xl font-semibold text-gray-700" }, 
              'Registro de Actividad'
            ),
            // Operario
            React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 
                'Operario de Producción'
              ),
              React.createElement('select', {
                value: operario,
                onChange: (e) => setOperario(e.target.value),
                className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
                disabled: cargandoOperarios
              },
                React.createElement('option', { value: "" }, 
                  cargandoOperarios ? 'Cargando...' : 'Selecciona operario'
                ),
                operarios.map((op, i) => 
                  React.createElement('option', { key: i, value: op.nombre }, 
                    `${op.nombre} ${op.codigo ? `(${op.codigo})` : ''}`
                  )
                )
              ),
              !cargandoOperarios && operarios.length > 0 && React.createElement('div', { className: "mt-2 text-sm text-green-600" },
                `✅ ${operarios.length} operarios disponibles`
              )
            ),
            // Órdenes asignadas
            operario && React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 
                'Órdenes Asignadas'
              ),
              cargandoOrdenes ? React.createElement('div', { className: "text-center py-4" }, 'Cargando órdenes...') :
              ordenesAsignadas.length === 0 ? React.createElement('div', { className: "text-gray-500 text-center py-4" }, 'No tienes órdenes pendientes') :
              React.createElement('div', { className: "space-y-2" },
                ordenesAsignadas.map((orden, i) => 
                  React.createElement('div', { 
                    key: i, 
                    className: "p-3 border rounded-lg bg-gray-50 cursor-pointer hover:bg-blue-50",
                    onClick: () => {
                      setProducto(orden.fields.Producto);
                      setEtapa('');
                    }
                  },
                    React.createElement('div', { className: "font-medium" }, orden.fields.Producto),
                    React.createElement('div', { className: "text-sm text-gray-600" }, 
                      `${orden.fields.Cantidad} ${orden.fields.Unidad_Medida} - ${orden.fields.Turno}`
                    ),
                    React.createElement('div', { className: "text-xs text-gray-500" }, 
                      `${orden.fields.Hora_Inicio_Programada} - ${orden.fields.Hora_Fin_Programada}`
                    )
                  )
                )
              )
            )
          ),
          // Panel central - Estado
          React.createElement('div', { className: "bg-gray-50 rounded-lg p-6" },
            React.createElement('h3', { className: "text-lg font-semibold text-gray-700 mb-4" }, 
              'Estado Actual'
            ),
            React.createElement('div', { className: "text-3xl font-mono text-center py-6 bg-white rounded-lg mb-4" }, 
              tiempoActual.toLocaleTimeString('es-ES')
            ),
            operario && React.createElement('div', { className: "text-center" },
              React.createElement('div', { className: "text-lg font-medium" }, 
                `Operario: ${operario}`
              ),
              React.createElement('div', { className: "text-sm text-gray-600 mt-2" }, 
                `${ordenesAsignadas.length} órdenes pendientes`
              )
            )
          ),
          // Panel derecho - Etapas
          producto && React.createElement('div', { className: "space-y-4" },
            React.createElement('h3', { className: "text-lg font-semibold text-gray-700" }, 
              'Etapas de Producción'
            ),
            React.createElement('div', { className: "text-sm font-medium text-gray-600 mb-2" }, 
              `Producto: ${producto}`
            ),
            React.createElement('select', {
              value: etapa,
              onChange: (e) => setEtapa(e.target.value),
              className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
            },
              React.createElement('option', { value: "" }, 'Selecciona etapa'),
              productosConEtapas[producto] && productosConEtapas[producto].map(e => 
                React.createElement('option', { key: e, value: e }, e)
              )
            ),
            React.createElement('div', { className: "flex gap-3" },
              React.createElement('button', {
                onClick: () => {
                  if (!operario || !etapa || !producto) {
                    alert('¡Completa todos los campos!');
                    return;
                  }
                  setTiempoInicio(new Date());
                  setEnProceso(true);
                },
                disabled: enProceso || !operario || !etapa || !producto,
                className: "flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              }, '▶️ Iniciar'),
              React.createElement('button', {
                onClick: () => {
                  if (!tiempoInicio) return;
                  const tiempoFin = new Date();
                  const duracionMs = tiempoFin - tiempoInicio;
                  const duracionMinutos = Math.round(duracionMs / 60000);
                  
                  const nuevoRegistro = {
                    id: Date.now(),
                    operario,
                    etapa,
                    producto,
                    inicio: tiempoInicio.toLocaleTimeString('es-ES'),
                    fin: tiempoFin.toLocaleTimeString('es-ES'),
                    duracion: duracionMinutos,
                    fecha: tiempoFin.toLocaleDateString('es-ES')
                  };
                  
                  setRegistros(prev => [nuevoRegistro, ...prev]);
                  setTiempoInicio(null);
                  setEnProceso(false);
                },
                disabled: !enProceso,
                className: "flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              }, '⏹️ Finalizar')
            ),
            enProceso && tiempoInicio && React.createElement('div', { className: "mt-4 p-4 bg-blue-50 rounded-lg text-center" },
              React.createElement('div', { className: "text-sm text-gray-600" }, 'Tiempo transcurrido'),
              React.createElement('div', { className: "text-2xl font-bold text-blue-600 font-mono" }, 
                (() => {
                  const diff = tiempoActual - tiempoInicio;
                  const minutos = Math.floor(diff / 60000);
                  const segundos = Math.floor((diff % 60000) / 1000);
                  return `${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
                })()
              )
            )
          )
        )
      ),
      // Historial
      registros.length > 0 && React.createElement('div', { className: "bg-white rounded-xl shadow-lg p-6" },
        React.createElement('h2', { className: "text-xl font-semibold text-gray-700 mb-4" }, 
          `Historial de Registros (${registros.length})`
        ),
        React.createElement('div', { className: "overflow-x-auto" },
          React.createElement('table', { className: "w-full border-collapse" },
            React.createElement('thead', null,
              React.createElement('tr', { className: "bg-gray-50" },
                ['Fecha', 'Operario', 'Producto', 'Etapa', 'Inicio', 'Fin', 'Duración (min)'].map(header =>
                  React.createElement('th', { 
                    key: header,
                    className: "border border-gray-200 px-4 py-3 text-left font-semibold text-gray-700" 
                  }, header)
                )
              )
            ),
            React.createElement('tbody', null,
              registros.map(registro => 
                React.createElement('tr', { key: registro.id, className: "hover:bg-gray-50" },
                  [registro.fecha, registro.operario, registro.producto, registro.etapa, 
                   registro.inicio, registro.fin, registro.duracion].map((cell, i) =>
                    React.createElement('td', { 
                      key: i,
                      className: "border border-gray-200 px-4 py-3" 
                    }, cell)
                  )
                )
              )
            )
          )
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(TiempoProduccionApp), document.getElementById('root'));
