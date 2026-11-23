document.addEventListener('DOMContentLoaded', () => {
    const notesContent = document.getElementById('notesContent');
    const actionButtons = document.querySelector('.action-buttons');
    const exportBtn = document.getElementById('exportBtn');
    const printBtn = document.getElementById('printBtn');
    const processingIndicator = document.getElementById('processingIndicator') || createProcessingIndicator();
    
    console.log('Notes page loaded');
    
    // Create processing indicator if it doesn't exist
    function createProcessingIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'processingIndicator';
        indicator.className = 'processing-indicator';
        indicator.style.display = 'none';
        
        indicator.innerHTML = `
            <div class="spinner"></div>
            <p>Processing...</p>
        `;
        
        document.body.appendChild(indicator);
        return indicator;
    }
    
    // Add jsPDF script if not already added
    if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
    }
    
    // Check if document content exists in localStorage
    const documentContent = localStorage.getItem('documentContent');
    console.log('Document content retrieved in notes.js:', documentContent ? 'Yes, length: ' + documentContent.length : 'No');
    
    if (!documentContent || documentContent.length === 0) {
        // Try to get processed content instead
        const processedContent = localStorage.getItem('processedContent');
        console.log('Processed content retrieved:', processedContent ? 'Yes, length: ' + processedContent.length : 'No');
        
        if (processedContent && processedContent.length > 0) {
            // Use processed content if document content is not available
            generateStudyNotes(processedContent);
            return;
        }
    }
    
    // Add this right after retrieving documentContent
    console.log('Document content in notes.js:', documentContent ? 'Found, length: ' + documentContent.length : 'Not found');
    
    // Also check if localStorage is working properly
    console.log('All localStorage keys:', Object.keys(localStorage));
    
    if (documentContent && documentContent.length > 0) {
        // Generate study notes directly from the document content
        generateStudyNotes(documentContent);
    } else {
        // Show message if no document content
        notesContent.innerHTML = `
            <div class="no-document-message">
                <i class="fas fa-file-upload"></i>
                <p>No document content found. Please upload a document on the home page first.</p>
                <a href="index.html" class="action-btn"><i class="fas fa-arrow-left"></i> Go to Upload</a>
            </div>
        `;
    }
    
    // Export notes functionality
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const format = prompt('Choose export format (pdf/txt):', 'pdf');
            if (format && (format.toLowerCase() === 'pdf' || format.toLowerCase() === 'txt')) {
                exportNotes(format.toLowerCase());
            }
        });
    }
    
    // Print notes functionality
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Function to generate study notes
    async function generateStudyNotes(content) {
        console.log('Generating study notes from content length:', content.length);
        
        // Show processing indicator
        processingIndicator.innerHTML = `
            <div class="spinner"></div>
            <p>Generating study notes...</p>
        `;
        processingIndicator.style.display = 'block';
        
        // Clear any previous content
        notesContent.innerHTML = '';
        
        try {
            // Call Gemini API to generate study notes
            const GEMINI_API_KEY = 'AIzaSyBJ-wgdlZ7i4nM_ebgkxbc1u3zC033ctQ4';
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            
            // Create a more focused prompt for study notes
            const requestData = {
                contents: [{
                    parts: [{
                        text: `Create detailed, comprehensive study notes from the following document content. 
                        
Your study notes should include:
1. A clear title based on the document content
2. At least 5-7 key concepts with explanations
3. Important definitions and terminology
4. Main principles and theories
5. Any formulas, frameworks, or methodologies
6. Examples where applicable

Format the notes with:
- Clear headings and subheadings
- Bullet points for key concepts
- Numbered lists for processes or steps
- Bold text for important terms

Make the notes comprehensive, well-structured, and suitable for studying.

Document content:
${content.substring(0, 15000)}`
                    }]
                }]
            };
            
            console.log('Calling Gemini API for study notes...');
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Received response from Gemini API');
            
            // Hide processing indicator
            processingIndicator.style.display = 'none';
            
            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
                throw new Error('Invalid response format from API');
            }
            
            // Get the generated notes
            const generatedNotes = data.candidates[0].content.parts[0].text;
            
            // Format the notes with HTML
            const formattedNotes = formatNotesWithHTML(generatedNotes);
            
            // Display the notes
            notesContent.innerHTML = `<div class="study-notes">${formattedNotes}</div>`;
            
            // Show action buttons
            actionButtons.style.display = 'flex';
            
        } catch (error) {
            console.error('Error generating study notes:', error);
            
            // Hide processing indicator
            processingIndicator.style.display = 'none';
            
            notesContent.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error generating study notes: ${error.message}</p>
                    <a href="index.html" class="action-btn"><i class="fas fa-sync-alt"></i> Try Again</a>
                </div>
            `;
        }
    }
    
    // Function to format notes with HTML
    function formatNotesWithHTML(notes) {
        let formatted = notes;
        
        // Convert markdown headings to HTML headings
        formatted = formatted.replace(/^# (.*$)/gm, '<h2>$1</h2>');
        formatted = formatted.replace(/^## (.*$)/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^### (.*$)/gm, '<h4>$1</h4>');
        
        // Convert bullet points to HTML list items
        formatted = formatted.replace(/^[*\-•] (.*$)/gm, '<li>$1</li>');
        
        // Group consecutive list items into unordered lists
        formatted = formatted.replace(/(<li>.*<\/li>\n)+/g, match => `<ul>${match}</ul>`);
        
        // Convert numbered lists
        formatted = formatted.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
        
        // Group consecutive numbered list items into ordered lists
        formatted = formatted.replace(/(<li>.*<\/li>\n)+/g, match => {
            if (!match.includes('<ul>')) {
                return `<ol>${match}</ol>`;
            }
            return match;
        });
        
        // Convert bold text
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');
        
        // Convert italic text
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/_(.*?)_/g, '<em>$1</em>');
        
        // Convert plain text paragraphs (lines that aren't already HTML)
        formatted = formatted.replace(/^(?!<h|<ul|<ol|<li|<p)(.*$)/gm, '<p>$1</p>');
        
        // Remove empty paragraphs
        formatted = formatted.replace(/<p>\s*<\/p>/g, '');
        
        return formatted;
    }
    
    // Function to export notes
    function exportNotes(format) {
        const notesElement = document.querySelector('.study-notes');
        if (!notesElement) {
            alert('No study notes available to export.');
            return;
        }
        
        const notesText = notesElement.innerText;
        
        if (format === 'pdf') {
            // Use jsPDF to create a PDF
            if (window.jspdf && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(20);
                doc.text('Study Notes', 105, 20, { align: 'center' });
                
                doc.setFontSize(12);
                
                // Split text into lines to fit on PDF page
                const textLines = doc.splitTextToSize(notesText, 180);
                doc.text(textLines, 15, 40);
                
                doc.save('study_notes.pdf');
            } else {
                alert('PDF export library not loaded. Please try the text format instead.');
            }
        } else {
            // Create a text file
            const blob = new Blob([notesText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'study_notes.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}); 