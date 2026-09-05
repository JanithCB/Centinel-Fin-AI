'use client';
import { useState } from 'react';
import styles from './IngestionTrigger.module.css';
import { ingestMessage, type IngestionResponse } from '@/lib/api';

const DEFAULT_PAYLOAD = {
  source: 'mock_n8n',
  externalMessageId: `mock-msg-${Date.now()}`,
  userReference: 'demo-user-001',
  messageText: 'LKR 2,500.00 was spent at Keells Super using card ending 1234 on 2026-09-05.',
  receivedAt: new Date().toISOString(),
};

type Status = 'idle' | 'loading' | 'success' | 'duplicate' | 'error';

export default function IngestionTrigger() {
  const [payload, setPayload] = useState(JSON.stringify(DEFAULT_PAYLOAD, null, 2));
  const [status, setStatus] = useState<Status>('idle');
  const [response, setResponse] = useState<IngestionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function trigger() {
    setStatus('loading');
    setResponse(null);
    setErrorMsg('');
    try {
      const parsed = JSON.parse(payload);
      // Refresh externalMessageId on each trigger to avoid duplicates
      parsed.externalMessageId = `mock-msg-${Date.now()}`;
      setPayload(JSON.stringify(parsed, null, 2));
      const res = await ingestMessage(parsed);
      setResponse(res);
      setStatus(res.status?.toUpperCase() === 'DUPLICATE' ? 'duplicate' : 'success');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Unknown error');
      setStatus('error');
    }
  }

  const statusConfig = {
    idle:      { label: '',            cls: '' },
    loading:   { label: 'Sending…',   cls: styles.loading },
    success:   { label: '✓ ACCEPTED', cls: styles.success },
    duplicate: { label: '⟳ DUPLICATE',cls: styles.duplicate },
    error:     { label: '✕ ERROR',    cls: styles.error },
  };

  return (
    <div className={`${styles.wrapper} glass-card`}>
      <div className={styles.header}>
        <span className={styles.devBadge}>DEV</span>
        <h2 className={styles.title}>Mock Ingestion Trigger</h2>
      </div>
      <p className={styles.desc}>
        Send a mock transaction payload to the ingestion endpoint to simulate the n8n pipeline.
      </p>

      <label className={styles.fieldLabel} htmlFor="ingestion-payload">
        Request Body (JSON)
      </label>
      <textarea
        id="ingestion-payload"
        className={styles.textarea}
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        rows={8}
        spellCheck={false}
      />

      <div className={styles.footer}>
        <button
          id="btn-trigger-ingestion"
          className="btn-teal"
          onClick={trigger}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Sending…' : '⚡ Send Mock Transaction'}
        </button>

        {status !== 'idle' && status !== 'loading' && (
          <span className={`${styles.statusBadge} ${statusConfig[status].cls}`}>
            {statusConfig[status].label}
          </span>
        )}
      </div>

      {/* Response panel */}
      {response && (
        <div className={styles.responseBox}>
          <p className={styles.responseTitle}>Response</p>
          <pre className={styles.responsePre}>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}
      {status === 'error' && (
        <div className={`${styles.responseBox} ${styles.errorBox}`}>
          <p className={styles.responseTitle}>Error</p>
          <p className={styles.errorText}>{errorMsg}</p>
          <p className={styles.errorHint}>
            Make sure the Spring Boot backend is running on port 8080 and the API key matches.
          </p>
        </div>
      )}
    </div>
  );
}
