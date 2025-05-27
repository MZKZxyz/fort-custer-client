// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  // You could also parse & verify the exp here if you like
  return token
    ? children
    : <Navigate to="/login" replace />;
}
