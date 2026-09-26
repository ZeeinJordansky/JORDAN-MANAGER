import React from 'react';
import DatabaseTab from '../../components/DatabaseTab';

export default function DatabasePage() {
  const secret = localStorage.getItem('panel_token') || '';
  
  return (
    <div className="space-y-6">
      <DatabaseTab secret={secret} />
    </div>
  );
}
