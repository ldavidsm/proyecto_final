import { Form, Select, InputNumber, DatePicker } from "antd";
import { useEffect, useState } from "react";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export default function DynamicFilters({ columnas = [], datos = [] }) {
  const [types, setTypes] = useState({});
  const [uniqueValues, setUniqueValues] = useState({});

  useEffect(() => {
    if (!Array.isArray(columnas) || columnas.length === 0) {
      setTypes({});
      setUniqueValues({});
      return;
    }

    const inferred = {};
    const uniques = {};

    columnas.forEach((col, idx) => {
      // datos es array de arrays (mismo orden que "columnas")
      const values = Array.isArray(datos)
        ? datos.map((row) => row?.[idx]).filter((v) => v !== null && v !== undefined)
        : [];

      // valores únicos (máx 20)
      uniques[col] = Array.from(new Set(values)).slice(0, 20);

      // detectar tipo con primer valor no nulo
      const sample = values.find((v) => v !== null && v !== undefined);

      let t = "string";
      if (sample !== undefined) {
        const asNumber = Number(sample);
        const asDate = dayjs(sample);
        if (!Number.isNaN(asNumber) && sample !== "" && sample !== true && sample !== false) {
          t = "number";
        } else if (asDate.isValid() && typeof sample !== "boolean") {
          t = "date";
        }
      }
      inferred[col] = t;
    });

    setTypes(inferred);
    setUniqueValues(uniques);
  }, [columnas, datos]);

  return (
    <>
      {columnas.map((col) => {
        const type = types[col];

        if (type === "number") {
          return (
            <Form.Item name={["filters", col]} label={col} key={col}>
              <InputNumber placeholder={`= valor para ${col}`} style={{ width: "100%" }} />
            </Form.Item>
          );
        }

        if (type === "date") {
          return (
            <Form.Item name={["filters", col]} label={col} key={col}>
              <RangePicker
                style={{ width: "100%" }}
                format="YYYY-MM-DD"
                disabledDate={(d) => d && d > dayjs()}
              />
            </Form.Item>
          );
        }

        // default string: Select con valores únicos si hay, si no deja buscar libre
        return (
          <Form.Item name={["filters", col]} label={col} key={col}>
            <Select
              allowClear
              showSearch
              placeholder={`Selecciona ${col}`}
              options={(uniqueValues[col] || []).map((v) => ({ value: v, label: String(v) }))}
              // si no hay únicos, permitimos escribir libremente
              // (AntD Select no admite libre por defecto; si quieres Input libre, cámbialo por Input)
            />
          </Form.Item>
        );
      })}
    </>
  );
}
