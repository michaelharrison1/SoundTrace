import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Persona {
  persona: string;
  description: string;
  slug: string;
}

const AIPersonaTab: React.FC = () => {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPersona() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get('/api/v1/openai/analyze');
        setPersona(res.data);
      } catch {
        setError('Failed to load persona.');
      } finally {
        setLoading(false);
      }
    }
    fetchPersona();
  }, []);

  const handlePublish = async () => {
    if (!persona) return;
    try {
      const res = await axios.post('/api/v1/openai/publish', { persona });
      setPublishedSlug(res.data.slug);
    } catch {
      setError('Failed to publish persona.');
    }
  };

  if (loading) return <div>Loading persona...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="p-2">
      <h4 className="font-bold mb-2">AI Persona-Based Audience Report</h4>
      {persona && (
        <div>
          <div className="mb-2"><b>Persona:</b> {persona.persona}</div>
          <div className="mb-2"><b>Description:</b> {persona.description}</div>
          <button className="win95-button-sm bg-blue-600 text-white px-2 py-1" onClick={handlePublish}>Publish Persona</button>
          {publishedSlug && (
            <div className="mt-2">
              <a href={`/api/v1/openai/public/${publishedSlug}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">View Public Persona</a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIPersonaTab;
