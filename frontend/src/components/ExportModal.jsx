import { useState } from "react";
import { Modal, Button, Radio } from 'antd';
import { ExportOutlined } from '@ant-design/icons';

export const ExportModal = ({ visible, onExport, onCancel }) => {
  const [format, setFormat] = useState('excel');

  return (
    <Modal
      title="Exportar Dashboard"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button 
          key="export" 
          type="primary" 
          icon={<ExportOutlined />}
          onClick={() => onExport(format)}
        >
          Exportar
        </Button>
      ]}
    >
      <Radio.Group 
        onChange={(e) => setFormat(e.target.value)} 
        value={format}
      >
        <Radio value="excel">Excel</Radio>
        <Radio value="pdf">PDF</Radio>
      </Radio.Group>
    </Modal>
  );
};