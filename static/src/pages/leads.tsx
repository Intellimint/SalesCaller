import React, { useEffect, useState } from 'react';
import LeadCard from '../components/LeadCard';

interface Lead {
  id: number;
  contact: string;
  company: string;
  phone: string;
  email: string;
  lead_status: string;
  last_contacted_at: string;
  interest_level: string;
  objection: string;
  sentiment: string;
  transcript: string;
  duration: number;
  email_count: number;
}

const LeadsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await fetch('/api/leads');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setLeads(data.leads);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
      setLoading(false);
    }
  };

  const handleSendEmail = async (leadId: number, type: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/send-email?email_type=${type}`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Refresh leads to update email count
      fetchLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    }
  };

  const handleUpdateStatus = async (leadId: number, status: string) => {
    try {
      const response = await fetch(`/api/leads/${leadId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Update local state
      setLeads(leads.map(lead => 
        lead.id === leadId ? { ...lead, lead_status: status } : lead
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (filter === 'all') return true;
    return lead.lead_status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border rounded"
        >
          <option value="all">All Leads</option>
          <option value="hot">Hot Leads</option>
          <option value="warm">Warm Leads</option>
          <option value="cold">Cold Leads</option>
          <option value="closed">Closed Leads</option>
        </select>
      </div>

      <div className="grid gap-6">
        {filteredLeads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onSendEmail={handleSendEmail}
            onUpdateStatus={handleUpdateStatus}
          />
        ))}
      </div>
    </div>
  );
};

export default LeadsPage;