// src/hooks/useAddress.js
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api/v1";

export function useAddress() {
  const { getAuthHeader } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all addresses
  const fetchAddresses = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/address`, {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });

      const data = await response.json();
      if (response.ok) {
        setAddresses(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch addresses');
      }
    } catch (err) {
      setError('Network error');
      console.error('Fetch addresses error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new address
  const createAddress = async (addressData) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(addressData)
      });

      const data = await response.json();
      if (response.ok) {
        await fetchAddresses(); // Refresh list
        return { success: true, data: data.data };
      } else {
        setError(data.error || 'Failed to create address');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('Network error');
      console.error('Create address error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  // Update address
  const updateAddress = async (id, addressData) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/address/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify(addressData)
      });

      const data = await response.json();
      if (response.ok) {
        await fetchAddresses(); // Refresh list
        return { success: true, data: data.data };
      } else {
        setError(data.error || 'Failed to update address');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('Network error');
      console.error('Update address error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  // Set default address
  const setDefaultAddress = async (id) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/address/${id}/default`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });

      const data = await response.json();
      if (response.ok) {
        await fetchAddresses(); // Refresh list
        return { success: true, data: data.data };
      } else {
        setError(data.error || 'Failed to set default address');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('Network error');
      console.error('Set default address error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  // Delete address
  const deleteAddress = async (id) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/address/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        }
      });

      const data = await response.json();
      if (response.ok) {
        await fetchAddresses(); // Refresh list
        return { success: true };
      } else {
        setError(data.error || 'Failed to delete address');
        return { success: false, error: data.error };
      }
    } catch (err) {
      setError('Network error');
      console.error('Delete address error:', err);
      return { success: false, error: 'Network error' };
    } finally {
      setLoading(false);
    }
  };

  // Get default address
  const getDefaultAddress = () => {
    return addresses.find(addr => addr.is_default) || null;
  };

  // Auto fetch on mount
  useEffect(() => {
    fetchAddresses();
  }, []);

  return {
    addresses,
    loading,
    error,
    fetchAddresses,
    createAddress,
    updateAddress,
    setDefaultAddress,
    deleteAddress,
    getDefaultAddress
  };
}