document.addEventListener('DOMContentLoaded', () => {
    const mnemonicsContent = document.getElementById('mnemonicsContent');
    const mnemonicInput = document.getElementById('mnemonicInput');
    const generateMnemonicBtn = document.getElementById('generateMnemonicBtn');
    const mnemonicsResults = document.getElementById('mnemonicsResults');
    const actionButtons = document.querySelector('.action-buttons');
    const exportBtn = document.getElementById('exportBtn');
    const printBtn = document.getElementById('printBtn');
    
    console.log('Mnemonics page loaded');
    
    // Add jsPDF script if not already added
    if (!window.jspdf) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(script);
    }
    
    // Handle generate mnemonic button
    if (generateMnemonicBtn) {
        generateMnemonicBtn.addEventListener('click', async () => {
            const input = mnemonicInput.value.trim();
            
            if (!input) {
                alert('Please enter some terms or concepts first.');
                return;
            }
            
            // Show loading state
            mnemonicsResults.innerHTML = `
                <div class="loading-indicator">
                    <div class="spinner"></div>
                    <p>Generating mnemonics...</p>
                </div>
            `;
            
            try {
                // Generate mnemonics
                const mnemonics = await generateMnemonics(input);
                
                // Display the mnemonics
                displayMnemonics(mnemonics);
                
                // Show action buttons
                actionButtons.style.display = 'flex';
            } catch (error) {
                console.error('Error generating mnemonics:', error);
                mnemonicsResults.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error generating mnemonics: ${error.message}</p>
                    </div>
                `;
            }
        });
    }
    
    // Export mnemonics functionality
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const format = prompt('Choose export format (pdf/txt):', 'pdf');
            if (format && (format.toLowerCase() === 'pdf' || format.toLowerCase() === 'txt')) {
                exportMnemonics(format.toLowerCase());
            }
        });
    }
    
    // Print mnemonics functionality
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }
    
    // Function to generate mnemonics using Gemini API
    async function generateMnemonics(input) {
        const GEMINI_API_KEY = 'AIzaSyBJ-wgdlZ7i4nM_ebgkxbc1u3zC033ctQ4';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        // Create a focused prompt for generating mnemonics
        const requestData = {
            contents: [{
                parts: [{
                    text: `Create 2-3 helpful mnemonics for the following terms or concepts:

${input}

For each mnemonic:
1. Create a memorable word, phrase, or acronym that helps remember the concept
2. Explain what each letter stands for
3. Provide a brief explanation of why this mnemonic is helpful

Make the mnemonics creative, memorable, and directly relevant to the input.
Format each mnemonic as a separate section with a title, explanation, and breakdown of the letters.`
                }]
            }]
        };
        
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
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts) {
            throw new Error('Invalid response format from API');
        }
        
        return data.candidates[0].content.parts[0].text;
    }
    
    // Function to display mnemonics
    function displayMnemonics(mnemonicsText) {
        // Format the mnemonics with HTML
        const formattedMnemonics = formatMnemonicsWithHTML(mnemonicsText);
        
        // Display the mnemonics
        mnemonicsResults.innerHTML = formattedMnemonics;
    }
    
    // Function to format mnemonics with HTML
    function formatMnemonicsWithHTML(mnemonicsText) {
        // Split the text into individual mnemonics (assuming they're separated by headings)
        const mnemonicSections = mnemonicsText.split(/^#+ /m).filter(section => section.trim().length > 0);
        
        if (mnemonicSections.length === 0) {
            // If we couldn't split by headings, try to identify mnemonics by numbered sections
            const numberedSections = mnemonicsText.split(/^\d+\.\s+/m).filter(section => section.trim().length > 0);
            if (numberedSections.length > 1) {
                return formatMnemonicCards(numberedSections);
            }
            
            // If all else fails, just return the formatted text
            return formatBasicText(mnemonicsText);
        }
        
        return formatMnemonicCards(mnemonicSections);
    }
    
    // Format mnemonic sections into cards
    function formatMnemonicCards(sections) {
        let html = '';
        
        sections.forEach(section => {
            // Extract the first line as the title
            const lines = section.split('\n');
            const title = lines[0].replace(/^[#\d.]+\s*/, '').trim();
            const content = lines.slice(1).join('\n');
            
            // Create a card for this mnemonic
            html += `
                <div class="mnemonic-card">
                    <h3>${title}</h3>
                    ${formatBasicText(content)}
                </div>
            `;
        });
        
        return html;
    }
    
    // Format basic text with markdown-like syntax
    function formatBasicText(text) {
        let formatted = text;
        
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
        
        // Add paragraph tags to plain text
        formatted = formatted.replace(/^(?!<h|<ul|<ol|<li|<p)(.*$)/gm, p => {
            if (p.trim().length > 0) {
                return `<p>${p}</p>`;
            }
            return '';
        });
        
        // Remove empty paragraphs
        formatted = formatted.replace(/<p>\s*<\/p>/g, '');
        
        // Add special styling for mnemonic letters
        formatted = formatted.replace(/\b([A-Z])(?=\s*[-–:]\s)/g, '<strong class="mnemonic-letter">$1</strong>');
        
        return formatted;
    }
    
    // Function to export mnemonics
    function exportMnemonics(format) {
        const mnemonicsElement = document.querySelector('.mnemonics-list');
        if (!mnemonicsElement) {
            alert('No mnemonics available to export.');
            return;
        }
        
        const mnemonicsText = mnemonicsElement.innerText;
        
        if (format === 'pdf') {
            // Use jsPDF to create a PDF
            if (window.jspdf && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                
                doc.setFontSize(20);
                doc.text('Mnemonics', 105, 20, { align: 'center' });
                
                doc.setFontSize(12);
                
                // Split text into lines to fit on PDF page
                const textLines = doc.splitTextToSize(mnemonicsText, 180);
                doc.text(textLines, 15, 40);
                
                doc.save('mnemonics.pdf');
            } else {
                alert('PDF export library not loaded. Please try the text format instead.');
            }
        } else {
            // Create a text file
            const blob = new Blob([mnemonicsText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mnemonics.txt';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}); 