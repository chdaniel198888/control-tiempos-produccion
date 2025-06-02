const { useState, useEffect } = React;
const { Clock, Play, Square, Download, Trash2 } = lucide;

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

  // Productos y etapas reales extraídos de tu matriz de producción
  const productosConEtapas = {
    'JACK DANIEL V3': ['PREPARACION DE UTENSILIOS', 'SOFRITO DE CEBOLLA PAITEÑA Y AJO', 'LICUADO Y COCCIÓN', 'PORCIONADO', 'LIMPIEZA DEL ÁREA'],
    'ZUMO DE FRESA': ['PREPARACION DE UTENSILIOS', 'PESADO Y LICUADO', 'PORCIONADO', 'EMPACADO PRIMARIO', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'SALSA VERDE V2': ['PREPARACION DE UTENSILIOS', 'MEZCLADO', 'PORCIONADO', 'LIMPIEZA DEL ÁREA'],
    'ALIÑO PECHUGA': ['PREPARACION DE UTENSILIOS', 'PESADO Y PRODUCCIÓN', 'LIMPIEZA DEL ÁREA'],
    'HAMBURGUESA V6': ['PREPARACION DE UTENSILIOS', 'PESADO', 'MOLIDA', 'MEZCLADO/PORCIONADO/ENFUNDADO/APLASTADO', 'TIEMPO DE CONGELACIÓN', 'EMPACADO SECUNDARIO', 'LIMPIEZA DEL ÁREA'],
    'COSTILLAS PAQ': ['PREPARACION DE UTENSILIOS', 'ALIÑADO', 'COCCION', 'PORCIONADO', 'EMPACADO', 'LIMPIEZA DEL ÁREA']
    // ... más productos
  };

  const productos = Object.keys(productosConEtapas);

  // Cargar operarios desde Airtable (ahora funcionará sin CSP)
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
        } else {
          console.error('Error al cargar operarios:', response.status);
          // Fallback con operarios reales conocidos
          setOperarios([
            { nombre: 'Arroyo Mosquera Erick Sebastián', codigo: 'RG018' },
            { nombre: 'Ruiz Jauregui Gabriel Enrique', codigo: 'RG014' },
            { nombre: 'Tirira Vasquez Carlos David', codigo: 'RG013' },
            { nombre: 'Minaya Alvarado Ramon Agustin', codigo: 'RG012' },
            { nombre: 'Blanco Paez Eugenio Andres', codigo: 'RG011' },
            { nombre: 'Tituaña Chachipanta Lenin Giovanni', codigo: 'FZ028' },
            { nombre: 'Yuquilema Duran Patricio Mentor', codigo: 'RG010' }
          ]);
        }
      } catch (error) {
        console.error('Error al conectar con Airtable:', error);
        setOperarios([
          { nombre: 'Arroyo Mosquera Erick Sebastián', codigo: 'RG018' },
          { nombre: 'Ruiz Jauregui Gabriel Enrique', codigo: 'RG014' },
          { nombre: 'Tirira Vasquez Carlos David', codigo: 'RG013' },
          { nombre: 'Minaya Alvarado Ramon Agustin', codigo: 'RG012' },
          { nombre: 'Blanco Paez Eugenio Andres', codigo: 'RG011' },
          { nombre: 'Tituaña Chachipanta Lenin Giovanni', codigo: 'FZ028' },
          { nombre: 'Yuquilema Duran Patricio Mentor', codigo: 'RG010' }
        ]);
      } finally {
        setCargandoOperarios(false);
      }
    };

    cargarOperarios();
  }, []);

  // ... resto del código de la app (funciones, render, etc.)
  
  return React.createElement('div', { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4" }, 
    // ... JSX convertido a React.createElement
  );
};

ReactDOM.render(React.createElement(TiempoProduccionApp), document.getElementById('root'));
