const GEMINI_API_KEY = 'AIzaSyBJ-wgdlZ7i4nM_ebgkxbc1u3zC033ctQ4';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let summaryGenerated = false;
let timerInterval;
let documentContent = '';

document.addEventListener('DOMContentLoaded', () => {
    // Basic elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.querySelector('.upload-btn');
    const summarySection = document.getElementById('summarySection');
    const summaryContent = document.getElementById('summaryContent');
    
    // Debug logging
    console.log('DOM loaded');
    console.log('File input:', fileInput);
    console.log('Upload button:', uploadBtn);
    console.log('Drop zone:', dropZone);
    
    // SIMPLIFIED FILE UPLOAD HANDLING
    
    // 1. Handle upload button click
    if (uploadBtn) {
        uploadBtn.onclick = function(e) {
            console.log('Upload button clicked');
            if (fileInput) {
                fileInput.click();
            } else {
                console.error('File input element not found');
            }
        };
    } else {
        console.error('Upload button not found');
    }
    
    // 2. Handle file selection
    if (fileInput) {
        fileInput.onchange = function(e) {
            console.log('File input changed');
            const file = e.target.files[0];
            if (file) {
                console.log('File selected:', file.name, file.type, file.size);
                processFile(file);
            }
        };
    } else {
        console.error('File input element not found');
    }
    
    // 3. Handle drag and drop
    if (dropZone) {
        dropZone.ondragover = function(e) {
            e.preventDefault();
            dropZone.classList.add('dragover');
        };
        
        dropZone.ondragleave = function() {
            dropZone.classList.remove('dragover');
        };
        
        dropZone.ondrop = function(e) {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) {
                console.log('File dropped:', file.name);
                processFile(file);
            }
        };
    } else {
        console.error('Drop zone not found');
    }
    
    // Process the uploaded file
    function processFile(file) {
        if (!file) {
            console.error('No file provided');
            return;
        }
        
        // Clear previous document data
        localStorage.removeItem('processedContent');
        localStorage.removeItem('documentContent');
        
        // Reset any UI elements that might show previous document data
        const testYourselfBtn = document.getElementById('testYourselfBtn');
        if (testYourselfBtn) {
            testYourselfBtn.disabled = true;
        }
        
        // Show loading state
        summarySection.style.display = 'block';
        
        // Show processing indicator
        const processingIndicator = document.getElementById('processingIndicator');
        processingIndicator.style.display = 'block';
        
        // Read the file
        if (file.type === 'application/pdf') {
            console.log('Processing PDF file');
            readPdfFile(file);
        } else {
            console.log('Processing text file');
            readTextFile(file);
        }
    }
    
    // Read text file
    function readTextFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const text = e.target.result;
            console.log('File read successfully, length:', text.length);
            documentContent = text;
            displayContent(text);
        };
        
        reader.onerror = function(e) {
            console.error('Error reading file:', e);
            summaryContent.innerHTML = '<div class="error">Error reading file. Please try again.</div>';
        };
        
        reader.readAsText(file);
    }
    
    // Read PDF file
    function readPdfFile(file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const typedArray = new Uint8Array(e.target.result);
            
            pdfjsLib.getDocument(typedArray).promise.then(function(pdf) {
                console.log('PDF loaded, pages:', pdf.numPages);
                let textContent = '';
                let pendingPages = pdf.numPages;
                
                // Extract text from each page
                for (let i = 1; i <= pdf.numPages; i++) {
                    pdf.getPage(i).then(function(page) {
                        page.getTextContent().then(function(content) {
                            const strings = content.items.map(item => item.str);
                            textContent += strings.join(' ') + '\n';
                            
                            pendingPages--;
                            if (pendingPages === 0) {
                                console.log('PDF text extracted, length:', textContent.length);
                                documentContent = textContent;
                                displayContent(textContent);
                            }
                        });
                    });
                }
            }).catch(function(error) {
                console.error('Error loading PDF:', error);
                summaryContent.innerHTML = '<div class="error">Error reading PDF. Please try again.</div>';
            });
        };
        
        reader.onerror = function(e) {
            console.error('Error reading file:', e);
            summaryContent.innerHTML = '<div class="error">Error reading file. Please try again.</div>';
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    // Process document with Gemini API
    async function processWithGemini(text) {
        console.log('Processing document with Gemini API...');
        
        try {
            // Prepare the request
            const requestData = {
                contents: [{
                    parts: [{
                        text: `Please analyze the following document and provide:
                        Keep the output text clean
                        1. A concise summary
                        2. Key concepts
                        3. Important details
                        4. Study notes
                        
                        Document content:
                        ${text.substring(0, 10000)}` // Limit to 10000 chars to avoid token limits
                    }]
                }]
            };
            
            // Call the API
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
            console.log('Gemini API response:', data);
            
            // Extract the response text
            const responseText = data.candidates[0].content.parts[0].text;
            
            // Store the processed content in localStorage
            localStorage.setItem('processedContent', responseText);
            console.log('Processed content saved to localStorage');
            
            return responseText;
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            throw error;
        }
    }
    
    // Update the displayContent function to use the processing indicator
    async function displayContent(text) {
        // Store original document content
        localStorage.setItem('documentContent', text);
        console.log('Document content saved to localStorage, length:', text.length);
        
        // Show processing indicator
        const processingIndicator = document.getElementById('processingIndicator');
        processingIndicator.style.display = 'block';
        
        try {
            // Process with Gemini API
            const processedContent = await processWithGemini(text);
            
            // Hide processing indicator
            processingIndicator.style.display = 'none';
            
            // Display success message and preview
            summaryContent.innerHTML = `
                <div class="success-message">Document processed successfully!</div>
                <div class="document-info">
                    <p><strong>AI Analysis Complete</strong></p>
                    <div class="document-preview">${processedContent.substring(0, 500)}...</div>
                    <p class="navigation-hint">Visit the Study Notes, Mnemonics, and Ask Doubts pages to see the full analysis.</p>
                </div>
            `;
            
            // Enable the Test Yourself button
            const testYourselfBtn = document.getElementById('testYourselfBtn');
            if (testYourselfBtn) {
                testYourselfBtn.disabled = false;
            }
        } catch (error) {
            // Hide processing indicator
            processingIndicator.style.display = 'none';
            
            // Show error message
            summaryContent.innerHTML = `
                <div class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error processing document: ${error.message}</p>
                    <p>Please try again or try with a different document.</p>
                </div>
            `;
        }
    }
    
    // Handle Test Yourself button
    const testYourselfBtn = document.getElementById('testYourselfBtn');
    if (testYourselfBtn) {
        testYourselfBtn.addEventListener('click', function() {
            if (documentContent) {
                localStorage.setItem('documentContent', documentContent);
                window.location.href = 'test.html';
            } else {
                alert('Please upload a document first.');
            }
        });
    }
    
    // Add some basic styles
    const style = document.createElement('style');
    style.textContent = `
        .loading {
            padding: 20px;
            text-align: center;
            color: var(--text-color);
        }
        .error {
            padding: 20px;
            color: #e74c3c;
            text-align: center;
        }
        .success-message {
            color: var(--primary-color);
            font-weight: bold;
            margin-bottom: 15px;
        }
        .document-preview {
            background: rgba(255,255,255,0.05);
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-family: monospace;
            white-space: pre-wrap;
        }
    `;
    document.head.appendChild(style);

    // Hamburger menu functionality
    const hamburgerMenu = document.getElementById('hamburgerMenu');
    const mainNav = document.getElementById('mainNav');

    if (hamburgerMenu && mainNav) {
        hamburgerMenu.addEventListener('click', function() {
            hamburgerMenu.classList.toggle('active');
            mainNav.classList.toggle('active');
        });
        
        // Close menu when clicking on a link
        const navLinks = mainNav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                hamburgerMenu.classList.remove('active');
                mainNav.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mainNav.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                hamburgerMenu.classList.remove('active');
                mainNav.classList.remove('active');
            }
        });
    }
});
