import { useState, useEffect } from 'react';
import { projectId, publicAnonKey, functionsBase } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BarChart3, Download, Calendar, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { toast } from "sonner";

interface ReportData {
  [location: string]: Array<{
    deviceName: string;
    deviceId: string;
    week: string;
    completedAt: string;
    completedBy: string;
    comment: string;
  }>;
}

export function Reports() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [reportData, setReportData] = useState<ReportData>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (selectedYear) {
      fetchReportData();
    }
  }, [selectedYear]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${functionsBase(projectId)}/reports/annual/${selectedYear}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      } else {
        toast.error('Failed to fetch report data');
        setReportData({});
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
      setReportData({});
    } finally {
      setLoading(false);
    }
  };

  const generateExcelReport = async () => {
    try {
      setGenerating(true);

      // Create a simple CSV format (since we can't use Excel libraries in this environment)
      let csvContent = '';

      Object.entries(reportData).forEach(([location, checks]) => {
        csvContent += `\n\n=== ${location} ===\n`;
        csvContent += 'Device Name,Device ID,Week,Completed Date,Completed By,Comment\n';

        checks.forEach(check => {
          const comment = check.comment?.replace(/,/g, ';') || ''; // Replace commas to avoid CSV issues
          csvContent += `"${check.deviceName}","${check.deviceId}","${check.week}","${check.completedAt}","${check.completedBy}","${comment}"\n`;
        });
      });

      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `device-maintenance-report-${selectedYear}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  // Generate year options (current year and previous 3 years)
  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let i = 0; i < 4; i++) {
    yearOptions.push((currentYear - i).toString());
  }

  // Calculate summary statistics
  const totalChecks = Object.values(reportData).reduce((sum, checks) => sum + checks.length, 0);
  const totalLocations = Object.keys(reportData).length;
  const uniqueDevices = new Set();
  const uniqueEmployees = new Set();

  Object.values(reportData).forEach(checks => {
    checks.forEach(check => {
      uniqueDevices.add(check.deviceId);
      uniqueEmployees.add(check.completedBy);
    });
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl">Annual Reports</h1>
          <p className="text-gray-600">Generate comprehensive maintenance reports by year</p>
        </div>

        <div className="flex items-center space-x-3">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            onClick={generateExcelReport}
            disabled={generating || totalChecks === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {generating ? 'Generating...' : 'Download CSV'}
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Checks</p>
                <p className="text-2xl">{totalChecks}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-50">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Locations</p>
                <p className="text-2xl">{totalLocations}</p>
              </div>
              <div className="p-3 rounded-full bg-green-50">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Unique Devices</p>
                <p className="text-2xl">{uniqueDevices.size}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-50">
                <FileSpreadsheet className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Staff Involved</p>
                <p className="text-2xl">{uniqueEmployees.size}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-50">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Data by Location */}
      {totalChecks === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BarChart3 className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg mb-2">No data for {selectedYear}</h3>
          <p className="text-gray-600">
            No completed device checks found for the selected year.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(reportData).map(([location, checks]) => (
            <Card key={location}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{location}</CardTitle>
                  <Badge variant="outline">
                    {checks.length} checks completed
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left p-2">Device Name</th>
                        <th className="text-left p-2">Device ID</th>
                        <th className="text-left p-2">Week</th>
                        <th className="text-left p-2">Completed Date</th>
                        <th className="text-left p-2">Completed By</th>
                        <th className="text-left p-2">Comment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checks.map((check, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-2">{check.deviceName}</td>
                          <td className="p-2 text-gray-600">{check.deviceId}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="text-xs">
                              Week {check.week}
                            </Badge>
                          </td>
                          <td className="p-2">{new Date(check.completedAt).toLocaleDateString()}</td>
                          <td className="p-2">{check.completedBy}</td>
                          <td className="p-2 text-gray-600 max-w-xs truncate">
                            {check.comment || 'No comment'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Export Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <FileSpreadsheet className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-blue-800 mb-2">Export Information</h4>
              <p className="text-sm text-blue-700 mb-2">
                The downloaded CSV file contains the following information for audit purposes:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• All completed device maintenance checks for {selectedYear}</li>
                <li>• Data organized by location/department for easy analysis</li>
                <li>• Employee tracking with timestamps for accountability</li>
                <li>• Maintenance comments and observations</li>
                <li>• Compliance-ready format for regulatory audits</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}