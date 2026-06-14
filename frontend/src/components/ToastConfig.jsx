import React from 'react';

export function ToastConfig() {
  return null;
}

export const toastConfig = {
  position: 'top-right',
  duration: 4000,
  success: {
    style: {
      background: '#f0fdf4',
      color: '#166534',
      border: '1px solid #bbf7d0',
    },
  },
  error: {
    style: {
      background: '#fef2f2',
      color: '#991b1b',
      border: '1px solid #fecaca',
    },
  },
};