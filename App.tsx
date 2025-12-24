
import React, { useState } from 'react';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Students } from './pages/Students.tsx';
import { Grades } from './pages/Grades.tsx';
import { Control } from './pages/Control.tsx';
import { Reports } from './pages/Reports.tsx';
import { Settings } from './pages/Settings.tsx';
import { Subjects } from './pages/Subjects.tsx';
import { About } from './pages/About.tsx';

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
