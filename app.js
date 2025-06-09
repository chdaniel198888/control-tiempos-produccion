const { useState, useEffect, useRef } = React;

// Componente de Login
const LoginComponent = ({ onLogin }) => {
  const [nombre, setNombre] = useState('');
  const [pin, setPin] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const config = {
    baseId: 'appxLN1eWmQtHtScK',
    token: 'patwsDQO9ESnSjoPm.f25ac0959b111660f0fe4bbe1a8f6475d5444999c0641e283cd050c84281b4e0',
    tables: {
      operarios: 'tbl1cnciEfyKNDmhE'
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const cargarUsuarios = async () => {
    try {
      const url = `https://api.airtable.com/v0/${config.baseId}/${config.tables.operarios}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const usuariosList = data.records.map(record => ({
          id: record.id,
          nombre: record.fields.Nombre || 'Sin nombre',
          cargo: record.fields.Cargo || '',
          claveAcceso: record.fields['Clave Acceso'] || ''
        }));
        setUsuarios(usuariosList);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const usuario = usuarios.find(u => u.nombre === nombre);
    if (!usuario) {
      setError('Usuario no encontrado');
      return;
    }

    if (usuario.claveAcceso !== pin) {
      setError('PIN incorrecto');
      return;
    }

    onLogin({
      nombre: usuario.nombre,
      cargo: usuario.cargo,
      id: usuario.id
    });
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl">⏳ Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
          🏭 Control de Producción
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario
            </label>
            <select
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Selecciona tu nombre</option>
              {usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.nombre}>
                  {usuario.nombre} ({usuario.cargo})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PIN (4 dígitos)
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength="4"
              pattern="\d{4}"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono"
              placeholder="••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 font-semibold text-lg"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

// Componente Dashboard para Jefe de Planta
const DashboardComponent = ({ usuario, onLogout }) => {
  const [metricas, setMetricas] = useState({
    produccionHoy: 0,
    eficienciaPromedio: 0,
    tiempoTotalPausas: 0,
    operariosActivos: 0
  });
  const [registros, setRegistros] = useState([]);
  const [pausas, setPausas] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState('hoy');
  const [filtroProducto, setFiltroProducto] = useState('todos');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const config = {
    baseId: 'appxLN1eWmQtHtScK',
    token: 'patwsDQO9ESnSjoPm.f25ac0959b111660f0fe4bbe1a8f6475d5444999c0641e283cd050c84281b4e0',
    tables: {
      registroEtapas: 'tblWptrJ5xbWiqSfI',
      registroPausas: 'tblKA6mBaR3EBF2y8'
    }
  };

  useEffect(() => {
    cargarDatos();
    const interval = setInterval(cargarDatos, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, [filtroFecha, filtroProducto]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar registros de etapas
      const responseEtapas = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.registroEtapas}`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });

      // Cargar registros de pausas
      const responsePausas = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.registroPausas}`, {
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (responseEtapas.ok && responsePausas.ok) {
        const dataEtapas = await responseEtapas.json();
        const dataPausas = await responsePausas.json();

        // Procesar registros según filtros
        const registrosProcesados = procesarRegistros(dataEtapas.records);
        const pausasProcesadas = procesarPausas(dataPausas.records);

        setRegistros(registrosProcesados);
        setPausas(pausasProcesadas);
        calcularMetricas(registrosProcesados, pausasProcesadas);
        
        // Extraer productos únicos
        const productosUnicos = [...new Set(registrosProcesados.map(r => r.producto))];
        setProductos(productosUnicos);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const procesarRegistros = (records) => {
    return records.map(record => ({
      fecha: record.fields.Fecha,
      operario: record.fields.Operario_Nombre,
      producto: record.fields.Producto_Nombre,
      etapa: record.fields.Etapa_Nombre,
      duracionTotal: record.fields.Duracion_Total_Min || 0,
      duracionProductiva: record.fields.Duracion_Productiva_Min || 0,
      eficiencia: record.fields.Porcentaje_Eficiencia || 0,
      estadoSemaforo: record.fields.Estado_Semaforo,
      turno: record.fields.Turno
    })).filter(r => aplicarFiltros(r));
  };

  const procesarPausas = (records) => {
    return records.map(record => ({
      fecha: record.fields.Fecha,
      operario: record.fields.Operario_Nombre,
      producto: record.fields.Producto_Nombre,
      tipo: record.fields.Tipo_Pausa,
      motivo: record.fields.Motivo_Pausa,
      duracion: record.fields.Duracion_Minutos || 0,
      turno: record.fields.Turno
    })).filter(p => aplicarFiltros(p));
  };

  const aplicarFiltros = (registro) => {
    // Filtro de fecha
    const hoy = new Date();
    const fechaRegistro = new Date(registro.fecha);
    
    switch (filtroFecha) {
      case 'hoy':
        if (fechaRegistro.toDateString() !== hoy.toDateString()) return false;
        break;
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - 7);
        if (fechaRegistro < inicioSemana) return false;
        break;
      case 'mes':
        const inicioMes = new Date(hoy);
        inicioMes.setDate(hoy.getDate() - 30);
        if (fechaRegistro < inicioMes) return false;
        break;
    }

    // Filtro de producto
    if (filtroProducto !== 'todos' && registro.producto !== filtroProducto) {
      return false;
    }

    return true;
  };

  const calcularMetricas = (registros, pausas) => {
    const operariosUnicos = new Set(registros.filter(r => {
      const hoy = new Date();
      return new Date(r.fecha).toDateString() === hoy.toDateString();
    }).map(r => r.operario));

    const eficiencias = registros.map(r => r.eficiencia);
    const eficienciaPromedio = eficiencias.length > 0 
      ? Math.round(eficiencias.reduce((a, b) => a + b, 0) / eficiencias.length)
      : 0;

    const tiempoTotalPausas = pausas.reduce((acc, p) => acc + p.duracion, 0);

    setMetricas({
      produccionHoy: registros.filter(r => {
        const hoy = new Date();
        return new Date(r.fecha).toDateString() === hoy.toDateString();
      }).length,
      eficienciaPromedio,
      tiempoTotalPausas,
      operariosActivos: operariosUnicos.size
    });
  };

  // Datos para gráficos
  const datosEficienciaPorOperario = () => {
    const porOperario = {};
    registros.forEach(r => {
      if (!porOperario[r.operario]) {
        porOperario[r.operario] = [];
      }
      porOperario[r.operario].push(r.eficiencia);
    });

    return Object.entries(porOperario).map(([operario, eficiencias]) => ({
      name: operario.split(' ')[0], // Solo primer nombre
      value: Math.round(eficiencias.reduce((a, b) => a + b, 0) / eficiencias.length)
    }));
  };

  const datosPausasPorTipo = () => {
    const porTipo = {};
    pausas.forEach(p => {
      if (!porTipo[p.tipo]) {
        porTipo[p.tipo] = 0;
      }
      porTipo[p.tipo] += p.duracion;
    });

    return Object.entries(porTipo).map(([tipo, duracion]) => ({
      name: tipo,
      value: duracion
    }));
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-2xl">⏳ Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                📊 Dashboard de Producción
              </h1>
              <p className="text-gray-600 mt-1">Bienvenido, {usuario.nombre}</p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="hoy">Hoy</option>
                <option value="semana">Última Semana</option>
                <option value="mes">Último Mes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto
              </label>
              <select
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="todos">Todos los productos</option>
                {productos.map(producto => (
                  <option key={producto} value={producto}>{producto}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Producción Hoy</p>
                <p className="text-3xl font-bold text-blue-600">{metricas.produccionHoy}</p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Eficiencia Promedio</p>
                <p className="text-3xl font-bold text-green-600">{metricas.eficienciaPromedio}%</p>
              </div>
              <div className="text-4xl">📈</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tiempo en Pausas</p>
                <p className="text-3xl font-bold text-orange-600">{metricas.tiempoTotalPausas} min</p>
              </div>
              <div className="text-4xl">⏸️</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Operarios Activos</p>
                <p className="text-3xl font-bold text-purple-600">{metricas.operariosActivos}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Eficiencia por Operario */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Eficiencia por Operario</h3>
            <div className="space-y-3">
              {datosEficienciaPorOperario().map((operario) => (
                <div key={operario.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{operario.name}</span>
                    <span className="font-semibold">{operario.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className={`h-6 rounded-full ${
                        operario.value >= 90 ? 'bg-green-500' :
                        operario.value >= 75 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${operario.value}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribution de Pausas */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Distribución de Pausas</h3>
            <div className="space-y-3">
              {datosPausasPorTipo().map((tipo) => (
                <div key={tipo.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{tipo.name}</span>
                  <span className="text-lg font-bold text-orange-600">{tipo.value} min</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabla de registros recientes */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Registros Recientes</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Operario</th>
                  <th className="p-2 text-left">Producto</th>
                  <th className="p-2 text-left">Etapa</th>
                  <th className="p-2 text-left">Eficiencia</th>
                  <th className="p-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {registros.slice(0, 10).map((registro, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{registro.fecha}</td>
                    <td className="p-2">{registro.operario}</td>
                    <td className="p-2">{registro.producto}</td>
                    <td className="p-2">{registro.etapa}</td>
                    <td className="p-2">
                      <span className={`font-semibold ${
                        registro.eficiencia >= 90 ? 'text-green-600' :
                        registro.eficiencia >= 75 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {registro.eficiencia}%
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        registro.estadoSemaforo === 'Verde' ? 'bg-green-100 text-green-800' :
                        registro.estadoSemaforo === 'Amarillo' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {registro.estadoSemaforo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de Control de Tiempos (tu código original)
const TiempoProduccionComponent = ({ usuario, onLogout }) => {
  // Estados principales
  const [operario, setOperario] = useState(usuario.nombre);
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
  const [odpId, setOdpId] = useState('');
  
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
      etapas: 'tblcg4CfbN36krPdC',
      registroPausas: 'tblKA6mBaR3EBF2y8',
      registroEtapas: 'tblWptrJ5xbWiqSfI'
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

  // Constantes para valores consistentes
  const TIPOS_PAUSA = {
    OPERATIVA: 'Operativa',
    ADMINISTRATIVA: 'Administrativa'
  };

  const ESTADOS_SEMAFORO = {
    VERDE: 'Verde',
    AMARILLO: 'Amarillo',
    ROJO: 'Rojo'
  };

  const TURNOS = {
    MANANA: 'Mañana',
    TARDE: 'Tarde',
    NOCHE: 'Noche'
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
        
        const ordenesProcesadas = data.records.map(record => {
          const orden = {
            id: record.id,
            ...record.fields
          };
          
          // Extraer el texto del producto correctamente
          if (Array.isArray(orden.Producto_Copia)) {
            orden.Producto_Copia = orden.Producto_Copia[0] || 'Sin producto';
          }
          
          console.log('Orden procesada:', {
            producto: orden.Producto_Copia,
            fecha: orden.Fecha_Programada,
            cantidad: orden.Cantidad
          });
          
          return orden;
        });
        
        setOrdenesPendientes(ordenesProcesadas);
        console.log('✅ Total órdenes pendientes:', ordenesProcesadas.length);
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
      console.log('🔍 Buscando etapas para producto:', producto);
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
        console.log('📋 Etapas encontradas:', data.records.length);
        
        const etapasData = data.records.map(record => ({
          id: record.id,
          etapaId: record.fields['Etapa ID'],
          nombre: record.fields['Etapa Nombre'],
          numero: record.fields['Etapa Número'],
          tiempoPromedio: record.fields['Tiempo Promedio (min)'] || 0,
          tiempoMinimo: record.fields['Tiempo Mínimo (min)'] || 0,
          tiempoMaximo: record.fields['Tiempo Máximo (min)'] || 0,
          unidad: record.fields['Unidad'] || 'Unidad',
          tipoEtapa: record.fields['Tipo De Etapa'] || 'Variable'
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
    
    const interval = setInterval(cargarDatos, 30000);
    return () => clearInterval(interval);
  }, [registros]);

  // Cargar etapas cuando se selecciona una orden
  useEffect(() => {
    if (ordenSeleccionada && ordenSeleccionada.Producto_Copia) {
      console.log('📌 Orden seleccionada, producto:', ordenSeleccionada.Producto_Copia);
      cargarEtapas(ordenSeleccionada.Producto_Copia);
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
    
    const tiempoEstimadoTotal = calcularTiempoTotal(
      etapaInfo.tiempoPromedio,
      ordenSeleccionada.Cantidad,
      etapaInfo.tipoEtapa
    );
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

  // Formatear tiempo en minutos a formato legible
  const formatearMinutos = (minutos) => {
    if (minutos < 60) {
      return `${minutos.toFixed(1)} min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const mins = Math.round(minutos % 60);
      if (mins === 0) {
        return `${horas}h`;
      }
      return `${horas}h ${mins}min`;
    }
  };

  // Calcular tiempo total según tipo de etapa
  const calcularTiempoTotal = (tiempoPorUnidad, cantidad, tipoEtapa) => {
    if (tipoEtapa === 'Estándar') {
      return tiempoPorUnidad;
    } else {
      return tiempoPorUnidad * cantidad;
    }
  };

  // Determinar turno según la hora
  const determinarTurno = (fecha) => {
    const hora = fecha.getHours();
    if (hora >= 6 && hora < 14) {
      return TURNOS.MANANA;
    } else if (hora >= 14 && hora < 22) {
      return TURNOS.TARDE;
    } else {
      return TURNOS.NOCHE;
    }
  };

  // Determinar estado del semáforo según eficiencia
  const determinarEstadoSemaforo = (porcentajeEficiencia) => {
    if (porcentajeEficiencia >= 90) {
      return ESTADOS_SEMAFORO.VERDE;
    } else if (porcentajeEficiencia >= 75) {
      return ESTADOS_SEMAFORO.AMARILLO;
    } else {
      return ESTADOS_SEMAFORO.ROJO;
    }
  };

  // Formatear fecha para mostrar
  const formatearFecha = (fecha) => {
    if (!fecha || fecha === 'Sin fecha') return 'Sin fecha';
    
    if (fecha.includes('-')) {
      const [año, mes, dia] = fecha.split('-');
      return `${dia}/${mes}/${año}`;
    }
    
    return fecha;
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
    
    const nuevoRegistro = {
      id: Date.now(),
      fecha: ahora.toLocaleDateString('es-ES'),
      operario,
      producto: ordenSeleccionada.Producto_Copia || 'Sin producto',
      etapa: etapaInfo.nombre,
      etapaId: etapa,
      horaInicio: ahora.toLocaleTimeString('es-ES'),
      horaFin: null,
      duracion: 0,
      ordenId: ordenSeleccionada.id,
      odpId: ordenSeleccionada['ODP ID'] || 'Sin ODP',
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
    const tiempoEstimadoTotal = calcularTiempoTotal(
      etapaInfo.tiempoPromedio,
      ordenSeleccionada.Cantidad,
      etapaInfo.tipoEtapa
    );
    const diferencia = duracionMinutos - tiempoEstimadoTotal;
    const porcentajeDiferencia = (diferencia / tiempoEstimadoTotal) * 100;
    const porcentajeEficiencia = Math.round(100 - Math.abs(porcentajeDiferencia));
    
    // Calcular tiempos de pausas
    const tiempoPausasTotal = pausas.reduce((acc, pausa) => {
      const fin = pausa.horaFin || ahora;
      return acc + Math.floor((fin - pausa.horaInicio) / 60000);
    }, 0);
    
    const tiempoPausasOperativas = pausas
      .filter(p => motivosPausa.find(m => m.id === p.motivo)?.tipo === 'operativa')
      .reduce((acc, pausa) => {
        const fin = pausa.horaFin || ahora;
        return acc + Math.floor((fin - pausa.horaInicio) / 60000);
      }, 0);
    
    const tiempoPausasAdmin = pausas
      .filter(p => motivosPausa.find(m => m.id === p.motivo)?.tipo === 'administrativa')
      .reduce((acc, pausa) => {
        const fin = pausa.horaFin || ahora;
        return acc + Math.floor((fin - pausa.horaInicio) / 60000);
      }, 0);
    
    const duracionProductiva = Math.round(duracionMinutos - tiempoPausasTotal);
    
    // Crear resumen de pausas
    const detallePausasResumen = pausas.map(p => {
      const duracion = p.horaFin ? Math.round((p.horaFin - p.horaInicio) / 60000) : 0;
      const motivoTexto = p.motivoTexto.replace(/[🚻🍽️🔧📦⚡🌡️🧹👥📋🏥📞🔄]/g, '').trim();
      return `${motivoTexto}: ${duracion}min`;
    }).join(', ') || 'Sin pausas';
    
    const resultados = {
      duracionMinutos: duracionMinutos.toFixed(2),
      tiempoEstimado: tiempoEstimadoTotal.toFixed(2),
      diferencia: diferencia.toFixed(2),
      porcentajeDiferencia: porcentajeDiferencia.toFixed(1),
      esMejor: diferencia < 0,
      pausas: pausas.length,
      tiempoPausas: tiempoPausasTotal
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
    
    // Guardar en las tablas de Airtable
    try {
      console.log('🚀 Iniciando guardado en Airtable...');
      
      // 1. Guardar en tabla Registro_Etapas_Ejecutadas
      const datosEtapa = {
        'Fecha': tiempoInicio.toISOString().split('T')[0],
        'Operario_Nombre': operario,
        'Orden_ID': ordenSeleccionada.id,
        'Producto_Nombre': ordenSeleccionada.Producto_Copia || 'Sin producto',
        'Etapa_Nombre': etapaInfo.nombre,
        'Etapa_Tipo': etapaInfo.tipoEtapa || 'Variable',
        'Hora_Inicio': tiempoInicio.toISOString(),
        'Hora_Fin': ahora.toISOString(),
        'Duracion_Total_Min': Math.round(duracionMinutos),
        'Duracion_Productiva_Min': duracionProductiva,
        'Numero_Pausas': pausas.length,
        'Tiempo_Total_Pausas_Min': tiempoPausasTotal,
        'Tiempo_Pausas_Operativas_Min': tiempoPausasOperativas,
        'Tiempo_Pausas_Admin_Min': tiempoPausasAdmin,
        'Detalle_Pausas_Resumen': detallePausasResumen,
        'Tiempo_Estimado_Min': Math.round(tiempoEstimadoTotal),
        'Diferencia_Min': Math.round(diferencia),
        'Porcentaje_Eficiencia': porcentajeEficiencia,
        'Estado_Semaforo': determinarEstadoSemaforo(porcentajeEficiencia),
        'Turno': determinarTurno(tiempoInicio),
        'Observaciones': resultados.esMejor ? 'Rendimiento superior al esperado' : 'Revisar causas de demora'
      };
      
      console.log('📋 Datos a enviar a Registro_Etapas:', datosEtapa);
      
      const responseEtapas = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.registroEtapas}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: datosEtapa
          }]
        })
      });
      
      if (!responseEtapas.ok) {
        const errorData = await responseEtapas.json();
        console.error('❌ Error en tabla Registro_Etapas_Ejecutadas:', errorData);
      } else {
        console.log('✅ Guardado en tabla Registro_Etapas_Ejecutadas');
      }
      
      // 2. Guardar pausas solo si existen
      if (pausas.length > 0) {
        console.log(`📊 Procesando ${pausas.length} pausas para guardar...`);
        
        // Limpiar motivos de texto antes de enviar
        const registrosPausas = pausas.map((pausa, index) => {
          const tipoPausa = motivosPausa.find(m => m.id === pausa.motivo)?.tipo || 'operativa';
          const horaFin = pausa.horaFin || ahora;
          const duracionMinutos = Math.round((horaFin - pausa.horaInicio) / 60000);
          
          // Limpiar emojis del texto del motivo
          const motivoLimpio = pausa.motivoTexto.replace(/[🚻🍽️🔧📦⚡🌡️🧹👥📋🏥📞🔄]/g, '').trim();
          
          const datosPausa = {
            'Operario_Nombre': operario,
            'Orden_ID': ordenSeleccionada.id,
            'Producto_Nombre': ordenSeleccionada.Producto_Copia || 'Sin producto',
            'Etapa_Nombre': etapaInfo.nombre,
            'Tipo_Pausa': tipoPausa === 'operativa' ? TIPOS_PAUSA.OPERATIVA : TIPOS_PAUSA.ADMINISTRATIVA,
            'Motivo_Pausa': motivoLimpio,
            'Fecha': pausa.horaInicio.toISOString().split('T')[0],
            'Hora_Inicio': pausa.horaInicio.toISOString(),
            'Hora_Fin': horaFin.toISOString(),
            'Duracion_Minutos': duracionMinutos,
            'Turno': determinarTurno(pausa.horaInicio)
          };
          
          console.log(`  Pausa ${index + 1}: ${motivoLimpio} - ${duracionMinutos} min`);
          
          return { fields: datosPausa };
        });
        
        console.log('📤 Enviando pausas a Airtable...');
        
        try {
          const responsePausas = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.registroPausas}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records: registrosPausas })
          });
          
          const pausasResult = await responsePausas.json();
          
          if (!responsePausas.ok) {
            console.error('❌ Error en tabla Registro_Pausas:', pausasResult);
            console.error('Detalles del error:', JSON.stringify(pausasResult.error, null, 2));
            
            // Intentar guardar pausas una por una si falla el batch
            console.log('🔄 Intentando guardar pausas individualmente...');
            
            for (let i = 0; i < registrosPausas.length; i++) {
              try {
                const responsePausaIndividual = await fetch(`https://api.airtable.com/v0/${config.baseId}/${config.tables.registroPausas}`, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${config.token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ records: [registrosPausas[i]] })
                });
                
                if (responsePausaIndividual.ok) {
                  console.log(`✅ Pausa ${i + 1} guardada individualmente`);
                } else {
                  const errorIndividual = await responsePausaIndividual.json();
                  console.error(`❌ Error en pausa ${i + 1}:`, errorIndividual);
                }
              } catch (errorIndividual) {
                console.error(`❌ Error al guardar pausa ${i + 1}:`, errorIndividual);
              }
            }
          } else {
            console.log('✅ Todas las pausas guardadas exitosamente');
            console.log(`✅ ${pausasResult.records.length} registros de pausa creados`);
          }
        } catch (errorPausas) {
          console.error('❌ Error general al guardar pausas:', errorPausas);
        }
      } else {
        console.log('ℹ️ No hay pausas para guardar');
      }
      
      console.log('✅ Proceso de guardado completado');
    } catch (error) {
      console.error('❌ Error general al guardar:', error);
      alert('❌ Error al guardar. El registro se mantiene localmente. Revisa la consola para más detalles.');
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
    const headers = ['Fecha', 'ODP ID', 'Operario', 'Producto', 'Etapa', 'Cantidad', 'Inicio', 'Fin', 'Duración (min)', 'Tiempo Estimado', '% Eficiencia', 'Pausas'];
    const rows = registros.map(r => [
      r.fecha, 
      r.odpId || 'Sin ODP',
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
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🕐 Control de Tiempos - Producción
              </h1>
              <p className="text-gray-600 mt-1">Operario: {usuario.nombre}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-lg text-gray-600">
                {tiempoActual.toLocaleDateString('es-ES')} {tiempoActual.toLocaleTimeString('es-ES')}
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Control */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Registro de Actividad</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
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
                    const fecha = formatearFecha(orden.Fecha_Programada || orden.Fecha_Orden);
                    const dia = orden.Día || orden.Dia || '';
                    const producto = Array.isArray(orden.Producto_Copia) ? orden.Producto_Copia[0] : (orden.Producto_Copia || 'Sin producto');
                    const cantidad = orden.Cantidad || 0;
                    const unidad = orden.Unidad || '';
                    
                    return (
                      <option key={orden.id} value={orden.id}>
                        {fecha} - {dia ? `${dia} - ` : ''}{producto} - {cantidad} {unidad}
                      </option>
                    );
                  })}
                </select>
                {ordenSeleccionada && ordenSeleccionada['ODP ID'] && (
                  <p className="text-sm text-blue-600 mt-2 font-semibold">
                    📋 ODP ID: {ordenSeleccionada['ODP ID']}
                  </p>
                )}
                {ordenesPendientes.length > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    ✅ {ordenesPendientes.length} órdenes pendientes cargadas
                  </p>
                )}
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
                     cargandoEtapas ? 'Cargando etapas...' : 
                     etapasDisponibles.length === 0 ? 'No hay etapas disponibles' : 'Selecciona etapa'}
                  </option>
                  {etapasDisponibles.map(e => (
                    <option key={e.etapaId} value={e.etapaId}>
                      {e.numero}. {e.nombre}
                    </option>
                  ))}
                </select>
                {etapaInfo && (
                  <div className="mt-3 space-y-3">
                    {/* Indicador del tipo de etapa */}
                    <div className={`p-2 rounded-lg text-center font-semibold ${
                      etapaInfo.tipoEtapa === 'Estándar' 
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                        : 'bg-green-100 text-green-800 border border-green-300'
                    }`}>
                      {etapaInfo.tipoEtapa === 'Estándar' ? '⚡ Etapa Estándar' : '📊 Etapa Variable'}
                    </div>

                    {/* Cards de métricas */}
                    <div className="grid grid-cols-1 gap-3">
                      {/* Card de Tiempo Estimado */}
                      <div className={`rounded-lg p-4 shadow-md border-2 ${
                        etapaInfo.tipoEtapa === 'Estándar'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                              <span className="text-lg">⏱️</span> Tiempo Estimado
                            </p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">
                              {formatearMinutos(calcularTiempoTotal(
                                etapaInfo.tiempoPromedio,
                                ordenSeleccionada.Cantidad,
                                etapaInfo.tipoEtapa
                              ))}
                            </p>
                          </div>
                          <div className={`text-4xl ${
                            etapaInfo.tipoEtapa === 'Estándar' ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            ⏱️
                          </div>
                        </div>
                      </div>

                      {/* Card de Mejor Tiempo */}
                      <div className={`rounded-lg p-4 shadow-md border-2 ${
                        etapaInfo.tipoEtapa === 'Estándar'
                          ? 'bg-yellow-50 border-yellow-200'
                          : 'bg-green-50 border-green-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 flex items-center gap-1">
                              <span className="text-lg">🎯</span> Mejor Tiempo
                            </p>
                            <p className="text-2xl font-bold text-gray-800 mt-1">
                              {formatearMinutos(calcularTiempoTotal(
                                etapaInfo.tiempoMinimo,
                                ordenSeleccionada.Cantidad,
                                etapaInfo.tipoEtapa
                              ))}
                            </p>
                          </div>
                          <div className={`text-4xl ${
                            etapaInfo.tipoEtapa === 'Estándar' ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            🏆
                          </div>
                        </div>
                      </div>

                      {/* Card de Detalles */}
                      <div className="rounded-lg p-3 bg-gray-50 border border-gray-200">
                        <p className="text-xs font-medium text-gray-600 mb-2">📈 Detalles del Cálculo</p>
                        <div className="space-y-1 text-xs text-gray-700">
                          <p>📦 Cantidad: <span className="font-semibold">{ordenSeleccionada.Cantidad} {ordenSeleccionada.Unidad}</span></p>
                          {etapaInfo.tipoEtapa === 'Variable' && (
                            <p>⏱️ Tiempo base: <span className="font-semibold">{etapaInfo.tiempoPromedio} min/{etapaInfo.unidad}</span></p>
                          )}
                          {etapaInfo.tipoEtapa === 'Estándar' && (
                            <p className="text-yellow-700">⚡ Tiempo fijo (no depende de cantidad)</p>
                          )}
                        </div>
                      </div>
                    </div>
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
                      {ordenSeleccionada.Producto_Copia || 'Sin producto'}
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
                  <th className="border p-2 text-left">ODP ID</th>
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
                    <td colSpan="10" className="border p-4 text-center text-gray-500">
                      No hay registros aún. ¡Comienza a registrar tiempos!
                    </td>
                  </tr>
                ) : (
                  registros.map((registro) => (
                    <tr key={registro.id} className="hover:bg-gray-50">
                      <td className="border p-2">{registro.fecha}</td>
                      <td className="border p-2 font-semibold text-blue-600">{registro.odpId || 'Sin ODP'}</td>
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

// Componente principal de la aplicación
const App = () => {
  const [usuario, setUsuario] = useState(null);

  const handleLogin = (datosUsuario) => {
    setUsuario(datosUsuario);
  };

  const handleLogout = () => {
    setUsuario(null);
  };

  // Si no hay usuario logueado, mostrar login
  if (!usuario) {
    return <LoginComponent onLogin={handleLogin} />;
  }

  // Si es jefe de planta, mostrar dashboard
  if (usuario.cargo === 'Jefe de Planta' || usuario.cargo === 'Jefe de planta') {
    return <DashboardComponent usuario={usuario} onLogout={handleLogout} />;
  }

  // Si es operario, mostrar control de tiempos
  return <TiempoProduccionComponent usuario={usuario} onLogout={handleLogout} />;
};

ReactDOM.render(<App />, document.getElementById('root'));
