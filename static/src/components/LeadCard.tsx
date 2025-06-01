import React from 'react';
import { format } from 'date-fns';

interface LeadCardProps {
  lead: {
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
  };
  onSendEmail: (leadId: number, type: string) => void;
  onUpdateStatus: (leadId: number, status: string) => void;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, onSendEmail, onUpdateStatus }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot':
        return 'bg-red-100 text-red-800';
      case 'warm':
        return 'bg-yellow-100 text-yellow-800';
      case 'cold':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{lead.contact}</h3>
          <p className="text-sm text-gray-600">{lead.company}</p>
        </div>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lead.lead_status)}`}>
            {lead.lead_status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(lead.sentiment)}`}>
            {lead.sentiment}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Phone</p>
          <p className="text-sm font-medium">{lead.phone}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Email</p>
          <p className="text-sm font-medium">{lead.email || 'Not provided'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Last Contacted</p>
          <p className="text-sm font-medium">
            {lead.last_contacted_at ? format(new Date(lead.last_contacted_at), 'MMM d, yyyy') : 'Never'}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Call Duration</p>
          <p className="text-sm font-medium">{lead.duration} seconds</p>
        </div>
      </div>

      {lead.objection && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">Objection</p>
          <p className="text-sm font-medium text-red-600">{lead.objection}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => onSendEmail(lead.id, 'follow_up')}
            className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            disabled={!lead.email}
          >
            Send Follow-up
          </button>
          <button
            onClick={() => onSendEmail(lead.id, 'demo_invite')}
            className="px-3 py-1 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
            disabled={!lead.email}
          >
            Send Demo Invite
          </button>
        </div>
        <select
          value={lead.lead_status}
          onChange={(e) => onUpdateStatus(lead.id, e.target.value)}
          className="px-3 py-1 text-sm border rounded"
        >
          <option value="new">New</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
          <option value="closed">Closed</option>
        </select>
      </div>
    </div>
  );
};

export default LeadCard; 