import React, { useState } from 'react';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [barriers, setBarriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    severity: '',
    status: ''
  });
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const barrierTypes = [
    { value: '', label: 'All Types' },
    { value: 'steps', label: 'Steps/Stairs' },
    { value: 'construction', label: 'Construction' },
    { value: 'curb', label: 'Blocked Curb' },
    { value: 'icy', label: 'Icy Surface' },
    { value: 'other', label: 'Other' }
  ];

  const severityLevels = [
    { value: '', label: 'All Severities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'new', label: 'New' },
    { value: 'in_review', label: 'In Review' },
    { value: 'resolved', label: 'Resolved' }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const authString = btoa(`${credentials.username}:${credentials.password}`);
    
    try {
      const response = await fetch('/api/barriers', {
        headers: {
          'Authorization': `Basic ${authString}`
        }
      });
      
      if (response.ok) {
        setIsAuthenticated(true);
        fetchBarriers(authString);
        toast.success('Login successful');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    }
  };

  const fetchBarriers = async (authString = null) => {
    try {
      const headers = {};
      if (authString) {
        headers['Authorization'] = `Basic ${authString}`;
      }
      
      const response = await fetch('/api/barriers', { headers });
      if (response.ok) {
        const data = await response.json();
        setBarriers(data.features || []);
      } else {
        toast.error('Failed to fetch barriers');
      }
    } catch (error) {
      toast.error('Failed to fetch barriers');
    } finally {
      setLoading(false);
    }
  };

  const updateBarrierStatus = async (id, status) => {
    const authString = btoa(`${credentials.username}:${credentials.password}`);
    
    try {
      const response = await fetch(`/api/barriers/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authString}`
        },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        toast.success('Status updated successfully');
        fetchBarriers(authString);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const exportCSV = () => {
    const filteredBarriers = barriers.filter(barrier => {
      const props = barrier.properties;
      return (!filters.type || props.type === filters.type) &&
             (!filters.severity || props.severity === filters.severity) &&
             (!filters.status || props.status === filters.status);
    });

    const csvContent = [
      ['ID', 'Date', 'Type', 'Severity', 'Status', 'Notes', 'Contact Name', 'Contact Email', 'Location'],
      ...filteredBarriers.map(barrier => [
        barrier.properties.id,
        new Date(barrier.properties.created_at).toLocaleDateString(),
        barrier.properties.type,
        barrier.properties.severity,
        barrier.properties.status,
        barrier.properties.notes || '',
        barrier.properties.contact_name || '',
        barrier.properties.contact_email || '',
        `${barrier.geometry.coordinates[1]}, ${barrier.geometry.coordinates[0]}`
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `barriers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredBarriers = barriers.filter(barrier => {
    const props = barrier.properties;
    return (!filters.type || props.type === filters.type) &&
           (!filters.severity || props.severity === filters.severity) &&
           (!filters.status || props.status === filters.status);
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Admin Dashboard
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to manage barrier reports
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={credentials.username}
                  onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Barrier Reports Dashboard</h1>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Export CSV
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {barrierTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {severityLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing {filteredBarriers.length} of {barriers.length} reports
            </p>
          </div>

          {/* Barriers table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : filteredBarriers.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No barrier reports found</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredBarriers.map((barrier) => {
                  const props = barrier.properties;
                  const statusColors = {
                    new: 'bg-red-100 text-red-800',
                    in_review: 'bg-yellow-100 text-yellow-800',
                    resolved: 'bg-green-100 text-green-800'
                  };
                  
                  return (
                    <li key={props.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[props.status]}`}>
                                  {props.status.replace('_', ' ')}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {props.type.replace(/\b\w/g, l => l.toUpperCase())}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(props.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-900 capitalize">{props.severity}</p>
                              <p className="text-sm text-gray-500">
                                {props.contact_name || 'Anonymous'}
                              </p>
                            </div>
                          </div>
                          {props.notes && (
                            <p className="mt-2 text-sm text-gray-600">{props.notes}</p>
                          )}
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-xs text-gray-500">
                              ID: {props.id}
                            </span>
                            <span className="text-xs text-gray-500">
                              Location: {barrier.geometry.coordinates[1].toFixed(6)}, {barrier.geometry.coordinates[0].toFixed(6)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <select
                            value={props.status}
                            onChange={(e) => updateBarrierStatus(props.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="new">New</option>
                            <option value="in_review">In Review</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
