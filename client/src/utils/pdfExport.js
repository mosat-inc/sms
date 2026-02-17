import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (elementId, filename = 'assessment-report.pdf') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Element not found for PDF export');
    }

    // Create canvas from the element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF report');
  }
};

export const generateAssessmentReportPDF = (reportData, customFilename = null) => {
  try {
    const pdf = new jsPDF();
    
    // Official Tanzania Header - Centered and Bold
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 15;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0); // Black color
    
    // THE UNITED REPUBLIC OF TANZANIA
    pdf.text('THE UNITED REPUBLIC OF TANZANIA', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY
    pdf.text('MINISTRY OF EDUCATION SCIENCE AND TECHNOLOGY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // School Header - Stylized
    pdf.setFontSize(16);
    pdf.setTextColor(0, 51, 102); // Dark blue color
    pdf.text('UBUNIFU SECONDARY SCHOOL', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Tagline
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(11);
    pdf.setTextColor(51, 51, 51); // Dark gray
    pdf.text('Excellence in Education • Nurturing Future Leaders', pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;
    
    // Contact Information
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(85, 85, 85); // Medium gray
    pdf.text('P.O. Box 123, Singida, Tanzania', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    pdf.text('Tel: +255 775117821, +255 615082570 • Email: info@ubunifusec.com', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Decorative line
    pdf.setLineWidth(0.5);
    pdf.setDrawColor(0, 51, 102);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 15;
    
    // Report Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(0, 51, 102);
    pdf.text('Comprehensive Teacher Analytics Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    
    // Teacher and Date info
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 51, 51);
    const teacherName = reportData.summary?.teacher_name || reportData.teacher_info?.name || 'Teacher';
    const academicYear = reportData.summary?.academic_year || reportData.teacher_info?.academic_year || '2024-2025';
    
    pdf.text(`Teacher: ${teacherName}`, 20, yPos);
    yPos += 6;
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPos);
    yPos += 6;
    pdf.text(`Academic Year: ${academicYear}`, 20, yPos);
    yPos += 10;
    
    // Applied Filters
    if (reportData.summary?.filters) {
      const filters = reportData.summary.filters;
      let filterText = 'Filters: ';
      if (filters.class_id) filterText += `Class, `;
      if (filters.subject_id) filterText += `Subject, `;
      if (filters.exam_type) filterText += `${filters.exam_type}, `;
      if (filters.start_date) filterText += `From ${filters.start_date}, `;
      if (filters.end_date) filterText += `To ${filters.end_date}, `;
      
      if (filterText !== 'Filters: ') {
        pdf.text(filterText.slice(0, -2), 20, yPos);
        yPos += 8;
      }
    }
    
    let yPosition = yPos;
    
    // Summary Statistics
    pdf.setFontSize(16);
    pdf.setTextColor(60, 60, 60);
    pdf.text('Summary Statistics', 20, yPosition);
    yPosition += 15;
    
    pdf.setFontSize(11);
    pdf.setTextColor(80, 80, 80);
    
    const stats = reportData.summary || {};
    pdf.text(`Total Assessments: ${stats.total_assessments || 0}`, 20, yPosition);
    pdf.text(`Total Students: ${stats.total_students || 0}`, 120, yPosition);
    yPosition += 10;
    
    pdf.text(`Overall Average: ${stats.overall_average || stats.average_score || 0}%`, 20, yPosition);
    pdf.text(`Graded Assessments: ${stats.graded_assessments || 0}`, 120, yPosition);
    yPosition += 20;

    // Detailed Student Performance by Subject
    if (reportData.performance && reportData.performance.length > 0) {
      pdf.setFontSize(16);
      pdf.setTextColor(60, 60, 60);
      pdf.text('Student Performance by Subject', 20, yPosition);
      yPosition += 15;
      
      // Group students by subject
      const studentsBySubject = {};
      reportData.performance.forEach(student => {
        if (!studentsBySubject[student.subject_name]) {
          studentsBySubject[student.subject_name] = [];
        }
        studentsBySubject[student.subject_name].push(student);
      });
      
      Object.entries(studentsBySubject).forEach(([subjectName, students]) => {
        if (yPosition > 240) {
          pdf.addPage();
          yPosition = 20;
        }
        
        // Subject Header
        pdf.setFontSize(14);
        pdf.setTextColor(40, 40, 40);
        pdf.text(`Subject: ${subjectName}`, 20, yPosition);
        yPosition += 12;
        
        // Calculate subject statistics
        const subjectStats = calculateSubjectStatistics(students);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Students: ${students.length} | Average: ${subjectStats.average}% | Highest: ${subjectStats.highest}% | Lowest: ${subjectStats.lowest}%`, 20, yPosition);
        yPosition += 15;
        
        // Student table header
        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.text('Student Name', 20, yPosition);
        pdf.text('Class', 70, yPosition);
        pdf.text('Total Marks', 100, yPosition);
        pdf.text('Percentage', 130, yPosition);
        pdf.text('Grade', 160, yPosition);
        pdf.text('Assessments', 180, yPosition);
        yPosition += 8;
        
        // Draw header underline
        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, yPosition - 2, 200, yPosition - 2);
        yPosition += 2;
        
        // Student rows
        pdf.setFontSize(8);
        pdf.setTextColor(80, 80, 80);
        
        students.forEach((student, index) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
            
            // Repeat subject header on new page
            pdf.setFontSize(14);
            pdf.setTextColor(40, 40, 40);
            pdf.text(`${subjectName} (continued)`, 20, yPosition);
            yPosition += 15;
            
            // Repeat table header
            pdf.setFontSize(9);
            pdf.setTextColor(60, 60, 60);
            pdf.text('Student Name', 20, yPosition);
            pdf.text('Class', 70, yPosition);
            pdf.text('Total Marks', 100, yPosition);
            pdf.text('Percentage', 130, yPosition);
            pdf.text('Grade', 160, yPosition);
            pdf.text('Assessments', 180, yPosition);
            yPosition += 8;
            pdf.setDrawColor(200, 200, 200);
            pdf.line(20, yPosition - 2, 200, yPosition - 2);
            yPosition += 2;
            pdf.setFontSize(8);
            pdf.setTextColor(80, 80, 80);
          }
          
          // Alternating row backgrounds
          if (index % 2 === 0) {
            pdf.setFillColor(248, 249, 250);
            pdf.rect(18, yPosition - 4, 184, 8, 'F');
          }
          
          const studentName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || student.student_name || 'Unknown';
          const className = student.class_name || 'N/A';
          const totalMarks = student.total_marks || student.marks_obtained || 0;
          const percentage = student.average_percentage || student.percentage || 0;
          const grade = student.overall_grade || student.grade || 'N/A';
          const assessmentCount = student.assessment_count || 1;
          
          pdf.text(studentName.substring(0, 25), 20, yPosition);
          pdf.text(className, 70, yPosition);
          pdf.text(totalMarks.toString(), 100, yPosition);
          pdf.text(`${percentage}%`, 130, yPosition);
          
          // Color-code grades
          const gradeColor = getGradeColor(grade);
          pdf.setTextColor(...gradeColor);
          pdf.text(grade, 160, yPosition);
          pdf.setTextColor(80, 80, 80);
          
          pdf.text(assessmentCount.toString(), 180, yPosition);
          yPosition += 8;
        });
        
        yPosition += 15;
      });
    }
    
    // Assessment Summary Table
    if (reportData.assessments && reportData.assessments.length > 0) {
      if (yPosition > 200) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.setTextColor(60, 60, 60);
      pdf.text('Assessment Details', 20, yPosition);
      yPosition += 15;
      
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text('Assessment Name', 20, yPosition);
      pdf.text('Subject', 80, yPosition);
      pdf.text('Class', 120, yPosition);
      pdf.text('Date', 150, yPosition);
      pdf.text('Avg %', 175, yPosition);
      yPosition += 8;
      
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, yPosition - 2, 200, yPosition - 2);
      yPosition += 2;
      
      pdf.setFontSize(8);
      pdf.setTextColor(80, 80, 80);
      
      reportData.assessments.forEach((assessment, index) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
          
          // Repeat header
          pdf.setFontSize(16);
          pdf.setTextColor(60, 60, 60);
          pdf.text('Assessment Details (continued)', 20, yPosition);
          yPosition += 15;
          
          pdf.setFontSize(9);
          pdf.setTextColor(60, 60, 60);
          pdf.text('Assessment Name', 20, yPosition);
          pdf.text('Subject', 80, yPosition);
          pdf.text('Class', 120, yPosition);
          pdf.text('Date', 150, yPosition);
          pdf.text('Avg %', 175, yPosition);
          yPosition += 8;
          pdf.setDrawColor(200, 200, 200);
          pdf.line(20, yPosition - 2, 200, yPosition - 2);
          yPosition += 2;
          pdf.setFontSize(8);
          pdf.setTextColor(80, 80, 80);
        }
        
        if (index % 2 === 0) {
          pdf.setFillColor(248, 249, 250);
          pdf.rect(18, yPosition - 4, 184, 8, 'F');
        }
        
        const assessmentName = (assessment.assessment_name || assessment.title || '').substring(0, 30);
        const subjectName = (assessment.subject_name || '').substring(0, 20);
        const className = (assessment.class_name || '').substring(0, 15);
        const date = assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString() : 'N/A';
        const average = assessment.average_percentage || 0;
        
        pdf.text(assessmentName, 20, yPosition);
        pdf.text(subjectName, 80, yPosition);
        pdf.text(className, 120, yPosition);
        pdf.text(date, 150, yPosition);
        pdf.text(`${average}%`, 175, yPosition);
        yPosition += 8;
      });
      
      yPosition += 10;
    }
    
    // Grade Distribution Summary
    if (reportData.grade_distribution && Object.keys(reportData.grade_distribution).length > 0) {
      if (yPosition > 220) {
        pdf.addPage();
        yPosition = 20;
      }
      
      pdf.setFontSize(16);
      pdf.setTextColor(60, 60, 60);
      pdf.text('Grade Distribution Summary', 20, yPosition);
      yPosition += 15;
      
      const grades = Object.entries(reportData.grade_distribution);
      const totalGraded = grades.reduce((sum, [_, count]) => sum + count, 0);
      
      pdf.setFontSize(10);
      pdf.setTextColor(80, 80, 80);
      
      grades.forEach(([grade, count]) => {
        const percentage = totalGraded > 0 ? Math.round((count / totalGraded) * 100) : 0;
        const gradeColor = getGradeColor(grade);
        
        pdf.setTextColor(...gradeColor);
        pdf.text(`Grade ${grade}:`, 20, yPosition);
        pdf.setTextColor(80, 80, 80);
        pdf.text(`${count} students (${percentage}%)`, 50, yPosition);
        yPosition += 10;
      });
    }
    
    // Footer
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `Page ${i} of ${pageCount} | Generated by SMS | ${new Date().toLocaleString()}`,
        105, 290, { align: 'center' }
      );
    }
    
    // Save the PDF
    const filename = customFilename || `teacher-analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF report:', error);
    throw new Error('Failed to generate PDF report');
  }
};

// Helper function to calculate subject statistics
const calculateSubjectStatistics = (students) => {
  if (!students || students.length === 0) {
    return { average: 0, highest: 0, lowest: 0, totalMarks: 0 };
  }
  
  const percentages = students
    .map(s => parseFloat(s.average_percentage || s.percentage || 0))
    .filter(p => p > 0);
  
  if (percentages.length === 0) {
    return { average: 0, highest: 0, lowest: 0, totalMarks: 0 };
  }
  
  const total = percentages.reduce((sum, p) => sum + p, 0);
  const average = Math.round((total / percentages.length) * 100) / 100;
  const highest = Math.max(...percentages);
  const lowest = Math.min(...percentages);
  const totalMarks = students.reduce((sum, s) => sum + parseFloat(s.total_marks || s.marks_obtained || 0), 0);
  
  return { average, highest, lowest, totalMarks };
};

// Helper function to get grade color
const getGradeColor = (grade) => {
  switch (grade) {
    case 'A': return [34, 197, 94]; // Green
    case 'B': return [59, 130, 246]; // Blue
    case 'C': return [245, 158, 11]; // Orange
    case 'D': return [239, 68, 68]; // Red
    case 'F': return [127, 29, 29]; // Dark Red
    default: return [107, 114, 128]; // Gray
  }
};
