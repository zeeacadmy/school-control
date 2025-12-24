
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { Grades } from './pages/Grades';
import { Control } from './pages/Control';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Subjects } from './pages/Subjects';
import { About } from './pages/About';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard setPage={setCurrentPage} />;
      case 'students': return <Students />;
      case 'subjects': return <Subjects />;
      case 'grades': return <Grades />;
      case 'control': return <Control />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      case 'about': return <About />;
      default: return <Dashboard setPage={setCurrentPage} />;
    }
  };

  return (
    <Layout activePage={currentPage} setPage={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

export default App;
