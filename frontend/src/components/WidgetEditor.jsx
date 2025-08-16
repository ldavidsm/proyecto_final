import { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Space } from 'antd';

export const WidgetEditor = ({ visible, widget, onSave, onCancel }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (widget) {
      form.setFieldsValue({
        title: widget.config?.title || '',
        chart_type: widget.chart_type,
        ...widget.config
      });
    }
  }, [widget, form]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const updatedWidget = {
        ...widget,
        config: {
          ...widget.config,
          ...values
        },
        chart_type: values.chart_type
      };
      await onSave(updatedWidget);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={`Editar Widget: ${widget?.item_type}`}
      visible={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      footer={[
        <Button key="back" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading} 
          onClick={handleSubmit}
        >
          Guardar
        </Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="title" label="Título" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        {widget?.item_type === 'chart' && (
          <Form.Item name="chart_type" label="Tipo de Gráfico">
            <Select>
              <Select.Option value="bar">Barras</Select.Option>
              <Select.Option value="line">Líneas</Select.Option>
              <Select.Option value="pie">Pastel</Select.Option>
              <Select.Option value="area">Área</Select.Option>
            </Select>
          </Form.Item>
        )}

        {/* Aquí puedes añadir más campos específicos para cada tipo de widget */}
      </Form>
    </Modal>
  );
};