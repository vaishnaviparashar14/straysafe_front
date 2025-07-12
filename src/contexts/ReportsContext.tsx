import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface StrayReport {
  id: string;
  title: string;
  description: string;
  location_lat: number;
  location_lng: number;
  location_address?: string;
  photos: string[];
  status: 'reported' | 'in_progress' | 'rescued' | 'adopted' | 'closed';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  reported_by: string;
  created_at: string;
  updated_at: string;
  assigned_ngo?: string;
  reporter_name?: string;
  ngo_name?: string;
  updates?: Array<{
    id: string;
    message: string;
    created_at: string;
    author_name: string;
    photos?: string[];
  }>;
}

interface ReportsContextType {
  reports: StrayReport[];
  loading: boolean;
  loadReports: (filters?: any) => Promise<void>;
  addReport: (report: any) => Promise<void>;
  updateReport: (id: string, updates: any) => Promise<void>;
  addUpdate: (reportId: string, update: any) => Promise<void>;
  getReportById: (id: string) => Promise<StrayReport | null>;
  getNearbyReports: (lat: number, lng: number, radius?: number) => Promise<StrayReport[]>;
}

const ReportsContext = createContext<ReportsContextType | undefined>(undefined);

export const useReports = () => {
  const context = useContext(ReportsContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportsProvider');
  }
  return context;
};

export const ReportsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<StrayReport[]>([]);
  const [loading, setLoading] = useState(false);

  const loadReports = async (filters: any = {}) => {
    try {
      setLoading(true);
      const response = await apiService.getReports(filters);
      setReports(response.reports || []);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const addReport = async (reportData: any) => {
    try {
      const response = await apiService.createReport(reportData);
      // Reload reports to get the updated list
      await loadReports();
      return response;
    } catch (error) {
      console.error('Failed to create report:', error);
      throw error;
    }
  };

     const updateReport = async (id: string, updates: any) => {
     try {
       const response = await apiService.updateReport(id, updates);
       // Update the local state
       setReports((prev: StrayReport[]) => prev.map((report: StrayReport) => 
         report.id === id ? { ...report, ...response.report } : report
       ));
       return response;
     } catch (error) {
       console.error('Failed to update report:', error);
       throw error;
     }
   };

  const addUpdate = async (reportId: string, update: any) => {
    try {
      const response = await apiService.addReportUpdate(reportId, update);
      // Reload the specific report or all reports
      await loadReports();
      return response;
    } catch (error) {
      console.error('Failed to add update:', error);
      throw error;
    }
  };

  const getReportById = async (id: string): Promise<StrayReport | null> => {
    try {
      const report = await apiService.getReport(id);
      return report;
    } catch (error) {
      console.error('Failed to get report:', error);
      return null;
    }
  };

  const getNearbyReports = async (lat: number, lng: number, radius: number = 10): Promise<StrayReport[]> => {
    try {
      const reports = await apiService.getNearbyReports(lat, lng, radius);
      return reports;
    } catch (error) {
      console.error('Failed to get nearby reports:', error);
      return [];
    }
  };

  const value: ReportsContextType = {
    reports,
    loading,
    loadReports,
    addReport,
    updateReport,
    addUpdate,
    getReportById,
    getNearbyReports
  };

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
};