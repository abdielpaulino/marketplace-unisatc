import { useState } from 'react';
import { REPORT_REASONS } from '../core/rules';
import { createReport } from '../core/services';
import { useAction } from '../context/Toast';
import { Field, Modal } from './ui';

export default function ReportModal({ targetType, targetId, onClose }) {
  const run = useAction();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const submit = async () => {
    const ok = await run(() => createReport({ targetType, targetId, reason, details }), 'Denúncia enviada. A administração vai analisar.');
    if (ok) onClose();
  };

  return (
    <Modal
      title={targetType === 'listing' ? 'Denunciar anúncio' : 'Denunciar usuário'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger" onClick={submit} disabled={!reason}>Enviar denúncia</button>
        </>
      }
    >
      <div className="form">
        <div className="radio-list">
          {REPORT_REASONS.map((r) => (
            <label key={r} className="check">
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
        </div>
        <Field label="Detalhes (opcional)">
          <textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Conte o que aconteceu…" />
        </Field>
      </div>
    </Modal>
  );
}
