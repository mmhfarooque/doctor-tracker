'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';
import { apiError } from '../lib/format';

/**
 * GET `path` whenever it changes (pass null to skip).
 * - Cancels a request as soon as a newer one replaces it (AbortController), so results never arrive out of order.
 * - Keeps the previous response visible while the next one loads (no flashing tables).
 * - State is only set from async callbacks, never synchronously inside the effect.
 * Returns { data, error, loading, reload } where `data` is the API response body ({ success, data, pagination }).
 */
export default function useApi(path, fallbackError = 'This data could not be loaded.') {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const key = path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!path) return undefined;
    const controller = new AbortController();
    const requestKey = `${path}#${version}`;
    api
      .get(path, { signal: controller.signal })
      .then((res) => setResult({ key: requestKey, data: res.data, error: '' }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult((prev) => ({ key: requestKey, data: prev.data, error: apiError(err, fallbackError) }));
      });
    return () => controller.abort();
  }, [path, version, fallbackError]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data: result.data, error: result.error, loading: key !== null && result.key !== key, reload };
}
