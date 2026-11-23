document.addEventListener('DOMContentLoaded', () => {
    const noDocumentMessage = document.getElementById('noDocumentMessage');
    const questionSection = document.getElementById('questionSection');
    const doubtQuestion = document.getElementById('doubtQuestion');
    const askDoubtBtn = document.getElementById('askDoubtBtn');
    const answersContainer = document.getElementById('answersContainer');
    
    console.log('Doubts page loaded');
    
    // Check if document content exists in localStorage
    const documentContent = localStorage.getItem('documentContent');
    console.log('Document content retrieved:', documentContent ? 'Yes, length: ' + documentContent.length : 'No');
    
    if (documentContent && documentContent.length > 0) {
        // Show question section
        if (noDocumentMessage) noDocumentMessage.style.display = 'none';
        if (questionSection) questionSection.style.display = 'block';
    }
    
    // Handle ask question button
    if (askDoubtBtn) {
        askDoubtBtn.addEventListener('click', async () => {
            const question = doubtQuestion.value.trim();
            
            if (!question) {
                alert('Please enter a question first.');
                return;
            }
            
            // Show loading state
            askDoubtBtn.disabled = true;
            askDoubtBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            
            try {
                // Call Gemini API to answer the question
                const answer = await askGeminiAPI(question, documentContent);
                
                // Create answer element
                const answerElement = document.createElement('div');
                answerElement.className = 'answer-card';
                
                answerElement.innerHTML = `
                    <div class="question">
                        <i class="fas fa-question-circle"></i>
                        <p>${question}</p>
                    </div>
                    <div class="answer">
                        <i class="fas fa-robot"></i>
                        <p>${answer}</p>
                    </div>
                    <div class="answer-time">
                        <small>Answered on ${new Date().toLocaleString()}</small>
                    </div>
                `;
                
                // Add to answers container
                answersContainer.prepend(answerElement);
                
                // Reset form
                doubtQuestion.value = '';
            } catch (error) {
                console.error('Error getting answer:', error);
                
                // Show error in answers container
                const errorElement = document.createElement('div');
                errorElement.className = 'answer-card error';
                
                errorElement.innerHTML = `
                    <div class="question">
                        <i class="fas fa-question-circle"></i>
                        <p>${question}</p>
                    </div>
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error: ${error.message}</p>
                    </div>
                `;
                
                answersContainer.prepend(errorElement);
            } finally {
                // Reset button state
                askDoubtBtn.disabled = false;
                askDoubtBtn.innerHTML = 'Ask Question';
            }
        });
    }
    
    // Function to ask Gemini API
    async function askGeminiAPI(question, documentContent) {
        const GEMINI_API_KEY = 'AIzaSyBJ-wgdlZ7i4nM_ebgkxbc1u3zC033ctQ4';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        // Create a focused prompt for answering questions
        const requestData = {
            contents: [{
                parts: [{
                    text: `Answer the following question based only on the information provided in the document. 
                    
Question: ${question}

If the answer cannot be found in the document, please say so and provide general information that might be helpful.

Document content:
${documentContent.substring(0, 15000)}`
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
}); 