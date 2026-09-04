import { ExtractionRequest, ExtractionResponse, ComparisonResponse, UploadResponse, HealthResponse } from '../types';

const API_BASE = '/api';

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) {
    throw new Error('Backend server connection failed');
  }
  return response.json();
}

export async function extractKeywords(payload: ExtractionRequest): Promise<ExtractionResponse> {
  const response = await fetch(`${API_BASE}/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: payload.text,
      method: payload.method || 'hybrid',
      top_n: payload.top_n || 10,
      weights: payload.weights,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to extract key phrases' }));
    throw new Error(errorData.detail || 'Extraction failed');
  }

  return response.json();
}

export async function compareMethods(payload: ExtractionRequest): Promise<ComparisonResponse> {
  const response = await fetch(`${API_BASE}/compare`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: payload.text,
      top_n: payload.top_n || 10,
      weights: payload.weights,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to compare extraction algorithms' }));
    throw new Error(errorData.detail || 'Comparison failed');
  }

  return response.json();
}

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to parse uploaded document' }));
    throw new Error(errorData.detail || 'Upload failed');
  }

  return response.json();
}
