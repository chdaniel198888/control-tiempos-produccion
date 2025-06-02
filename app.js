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

  // Productos y etapas reales
  const productosConEtapas = {
    'JACK DANIEL V3': ['PREPARACION DE UTENSILIOS', 'SOFRITO DE CEBOLLA PAITEÑA Y AJO', 'LICUADO Y COCCIÓN', 'PORCIONADO', 'LIMPIEZA DEL ÁREA'],
    'ZUMO DE FRESA': ['PREPARACION DE UTENSILIOS', 'PESADO Y LICUADO', 'PORCIONADO', 'EMPACADO PRIMARIO', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'SALSA VERDE V2': ['PREPARACION DE UTENSILIOS', 'MEZCLADO', 'PORCIONADO', 'LIMPIEZA DEL ÁREA'],
    'ALIÑO PECHUGA': ['PREPARACION DE UTENSILIOS', 'PESADO Y PRODUCCIÓN', 'LIMPIEZA DEL ÁREA'],
    'HAMBURGUESA V6': ['PREPARACION DE UTENSILIOS', 'PESADO', 'MOLIDA', 'MEZCLADO/PORCIONADO/ENFUNDADO/APLASTADO', 'TIEMPO DE CONGELACIÓN', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'COSTILLAS PAQ': ['PREPARACION DE UTENSILIOS', 'ALIÑADO', 'COCCION', 'PORCIONADO', 'EMPACADO', 'LIMPIEZA DEL ÁREA']
  };

  const productos = Object.keys(productosConEtapas);

  // Cargar operarios desde Airtable
  useEffect(() => {
    const cargarOperarios = async () => {
      try {
        setCargandoOperarios(true);
        
        const baseId = 'appzTllAjxu4TOs1a';
        const tableId = 'tbldYTLfQ3DoEK0WA';
        const token = 'patVNOhNd8sd7aFNf.ea0625015701b662df173fa067123aedb52f9dc6b769732c8886775e5c01cdd0';
        
        const filterFormula = `{Cargo} = 'Operario de producción'`;
        const encodedFilter = encodeURIComponent(filterFormula);
        
        const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodedFilter}&fields[]=Nombre&fields[]=Código Trabajador&sort[0][field]=Nombre&sort[0][direction]=asc`;
        
        console.log('🔄 Conectando con Airtable...');
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
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
            console.log(`✅ ${operariosData.length} operarios cargados desde Airtable:`, operariosData);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setCargandoOperarios(false);
      }
    };

    cargarOperarios();
  }, []);

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
    React.createElement('div', { className: "max-w-4xl mx-auto" },
      React.createElement('div', { className: "bg-white rounded-xl shadow-lg p-6" },
        React.createElement('h1', { className: "text-3xl font-bold text-gray-800 mb-6" }, 
          '🕐 Control de Tiempos - Producción'
        ),
        React.createElement('div', { className: "grid md:grid-cols-2 gap-6" },
          // Panel izquierdo
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
              )
            ),
            // Producto
            React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 
                'Producto'
              ),
              React.createElement('select', {
                value: producto,
                onChange: (e) => {
                  setProducto(e.target.value);
                  setEtapa('');
                },
                className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              },
                React.createElement('option', { value: "" }, 'Selecciona producto'),
                productos.map(p => 
                  React.createElement('option', { key: p, value: p }, p)
                )
              )
            ),
            // Etapa
            React.createElement('div', null,
              React.createElement('label', { className: "block text-sm font-medium text-gray-700 mb-2" }, 
                'Etapa'
              ),
              React.createElement('select', {
                value: etapa,
                onChange: (e) => setEtapa(e.target.value),
                className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500",
                disabled: !producto
              },
                React.createElement('option', { value: "" }, 
                  !producto ? 'Primero selecciona producto' : 'Selecciona etapa'
                ),
                producto && productosConEtapas[producto] && productosConEtapas[producto].map(e => 
                  React.createElement('option', { key: e, value: e }, e)
                )
              )
            )
          ),
          // Panel derecho
          React.createElement('div', { className: "bg-gray-50 rounded-lg p-6" },
            React.createElement('h3', { className: "text-lg font-semibold text-gray-700 mb-4" }, 
              'Estado Actual'
            ),
            React.createElement('div', { className: "text-2xl font-mono text-center py-4 bg-white rounded-lg" }, 
              tiempoActual.toLocaleTimeString('es-ES')
            ),
            React.createElement('div', { className: "mt-4 text-center" },
              React.createElement('div', { className: "text-lg" }, 
                `${operarios.length} operarios disponibles`
              )
            )
          )
        )
      )
    )
  );
};

ReactDOM.render(React.createElement(TiempoProduccionApp), document.getElementById('root'));
