import { useEffect, useState, useContext } from "react";
import ApexCharts from "react-apexcharts";
import { getChartData } from "../services/chartService";
import { AuthContext } from "../context/AuthContext";
import { getTableData } from "../services/tableService";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Mapeo de tipos de gráfico a configuraciones específicas
const CHART_TYPES = {
  pastel: { apexType: "pie", needsX: true, needsY: false },
  barras: { apexType: "bar", needsX: true, needsY: false },
  lineas: { apexType: "line", needsX: true, needsY: true },
  histograma: { apexType: "bar", needsX: true, needsY: false },
  heatmap: { apexType: "heatmap", needsX: false, needsY: false },
  boxplot: { apexType: "boxPlot", needsX: false, needsY: true },
  dispersión: { apexType: "scatter", needsX: true, needsY: true }
};

export default function ChartViewer({ tableId, onClose }) {
  const { token } = useContext(AuthContext);
  const [columns, setColumns] = useState([]);
  const [chartType, setChartType] = useState("barras");
  const [xColumn, setXColumn] = useState("");
  const [yColumn, setYColumn] = useState("");
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [chartOptions, setChartOptions] = useState({
    chart: { toolbar: { show: true } },
    colors: ["#3A57E8", "#1AA053", "#F16A1B", "#9B59B6"]
  });
  const [chartSeries, setChartSeries] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Cargar columnas al montar o cambiar tabla
  useEffect(() => {
    const loadColumns = async () => {
      try {
        const data = await getTableData(token, tableId);
        const cols = data.columnas;
        setColumns(cols);
        setXColumn(cols[0] || "");
        setYColumn(cols[1] || "");
        console.log("Columnas cargadas:", cols);
      } catch (err) {
        setError("Error al cargar columnas");
      }
    };
    loadColumns();
  }, [tableId, token]);

  // Generar gráfico con validación
  const handleGenerateChart = async () => {
    const config = CHART_TYPES[chartType];
    if (!config) {
      setError("Tipo de gráfico no soportado");
      return;
    }

    if (config.needsX && !xColumn) {
      setError(`Se requiere columna X para gráfico ${chartType}`);
      return;
    }

    if (config.needsY && !yColumn) {
      setError(`Se requiere columna Y para gráfico ${chartType}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getChartData(
        tableId,
        chartType,
        xColumn,
        yColumn,
        token,
        dateRange.start.toISOString().split('T')[0],
        dateRange.end.toISOString().split('T')[0]
      );

      const { options, series } = processChartData(data);
      setChartOptions(options);
      setChartSeries(series);
    } catch (err) {
      setError(err.message || "Error al generar gráfico");
    } finally {
      setIsLoading(false);
    }
  };

  // Transformar datos del backend a formato ApexCharts
  const processChartData = (data) => {
    switch (data.tipo) {
      case "pastel":
        return {
          options: {
            ...chartOptions,
            labels: Object.keys(data.datos),
            chart: { ...chartOptions.chart, type: "pie" }
          },
          series: Object.values(data.datos)
        };

      case "barras":
        return {
          options: {
            ...chartOptions,
            xaxis: { categories: Object.keys(data.datos) },
            chart: { ...chartOptions.chart, type: "bar" }
          },
          series: [{ name: yColumn || "Valor", data: Object.values(data.datos) }]
        };

      case "lineas":
        return {
          options: {
            ...chartOptions,
            xaxis: { 
              categories: Object.keys(data.datos),
              type: "datetime",
              labels: { format: 'dd MMM yyyy' }
            },
            chart: { ...chartOptions.chart, type: "line" }
          },
          series: [{ name: yColumn, data: Object.values(data.datos) }]
        };

      case "histograma":
        return {
          options: {
            ...chartOptions,
            xaxis: { categories: data.datos.labels },
            chart: { ...chartOptions.chart, type: "bar" }
          },
          series: [{ name: "Frecuencia", data: data.datos.values }]
        };

      case "heatmap":
        const categories = Object.keys(data.datos);
        return {
          options: {
            ...chartOptions,
            chart: { ...chartOptions.chart, type: "heatmap" },
            plotOptions: {
              heatmap: {
                shadeIntensity: 0.5,
                colorScale: {
                  ranges: [
                    { from: -1, to: 0, color: "#FF0000" },
                    { from: 0, to: 0.5, color: "#FFFF00" },
                    { from: 0.5, to: 1, color: "#00FF00" }
                  ]
                }
              }
            },
            dataLabels: { enabled: false },
            xaxis: { categories },
            yaxis: { categories }
          },
          series: categories.map(col => ({
            name: col,
            data: categories.map(row => data.datos[col][row] || 0)
          }))
        };

      default:
        return { options: chartOptions, series: [] };
    }
  };

  return (
    <div style={{ 
      padding: "20px", 
      border: "1px solid #ddd", 
      borderRadius: "8px",
      backgroundColor: "white",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
    }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: "20px"
      }}>
        <h3 style={{ margin: 0 }}>Generador de Gráficos</h3>
        <button 
          onClick={onClose}
          style={{ 
            padding: "5px 10px",
            background: "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          Cerrar
        </button>
      </div>

      {error && (
        <div style={{ 
          padding: "10px", 
          marginBottom: "15px", 
          background: "#ffebee", 
          color: "#d32f2f",
          borderRadius: "4px"
        }}>
          {error}
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", 
        gap: "15px",
        marginBottom: "20px"
      }}>
        {/* Selector de tipo de gráfico */}
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
            Tipo de Gráfico
          </label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{ 
              width: "100%", 
              padding: "8px", 
              borderRadius: "4px", 
              border: "1px solid #ddd"
            }}
          >
            {Object.keys(CHART_TYPES).map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Selector de columna X */}
        {CHART_TYPES[chartType]?.needsX && (
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
              Columna X
            </label>
            <select
              value={xColumn}
              onChange={(e) => setXColumn(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "8px", 
                borderRadius: "4px", 
                border: "1px solid #ddd"
              }}
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selector de columna Y */}
        {CHART_TYPES[chartType]?.needsY && (
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
              Columna Y
            </label>
            <select
              value={yColumn}
              onChange={(e) => setYColumn(e.target.value)}
              style={{ 
                width: "100%", 
                padding: "8px", 
                borderRadius: "4px", 
                border: "1px solid #ddd"
              }}
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selector de fecha inicio */}
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
            Fecha Inicio
          </label>
          <DatePicker
            selected={dateRange.start}
            onChange={(date) => setDateRange({...dateRange, start: date})}
            dateFormat="yyyy-MM-dd"
            className="date-picker"
          />
        </div>

        {/* Selector de fecha fin */}
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>
            Fecha Fin
          </label>
          <DatePicker
            selected={dateRange.end}
            onChange={(date) => setDateRange({...dateRange, end: date})}
            dateFormat="yyyy-MM-dd"
            className="date-picker"
          />
        </div>
      </div>

      <button
        onClick={handleGenerateChart}
        disabled={isLoading}
        style={{
          padding: "10px 20px",
          background: isLoading ? "#cccccc" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: isLoading ? "not-allowed" : "pointer",
          marginBottom: "20px"
        }}
      >
        {isLoading ? "Generando..." : "Generar Gráfico"}
      </button>

      {chartSeries.length > 0 ? (
        <div style={{ marginTop: "20px" }}>
          <ApexCharts
            options={chartOptions}
            series={chartSeries}
            type={chartOptions.chart.type}
            height={400}
          />
        </div>
      ) : (
        <div style={{ 
          padding: "40px", 
          textAlign: "center", 
          color: "#666",
          border: "2px dashed #ddd",
          borderRadius: "8px"
        }}>
          {isLoading ? "Cargando datos..." : "No hay datos para mostrar. Genera un gráfico."}
        </div>
      )}
    </div>
  );
}