document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const testSetup = document.getElementById('testSetup');
    const testInProgress = document.getElementById('testInProgress');
    const testResults = document.getElementById('testResults');
    const noDocumentMessage = document.getElementById('noDocumentMessage');
    const testOptions = document.getElementById('testOptions');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    
    // Setup elements
    const questionTypeSelect = document.getElementById('questionType');
    const questionCountSelect = document.getElementById('questionCount');
    const difficultyLevelSelect = document.getElementById('difficultyLevel');
    const timeLimitSelect = document.getElementById('timeLimit');
    const startTestBtn = document.getElementById('startTestBtn');
    
    // Test elements
    const questionCounter = document.getElementById('questionCounter');
    const timer = document.getElementById('timer');
    const questionContainer = document.getElementById('questionContainer');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitTestBtn = document.getElementById('submitTestBtn');
    
    // Results elements
    const resultsSummary = document.getElementById('resultsSummary');
    const resultsDetails = document.getElementById('resultsDetails');
    const retestNewBtn = document.getElementById('retestNewBtn');
    const retestSameBtn = document.getElementById('retestSameBtn');
    const downloadResultsBtn = document.getElementById('downloadResultsBtn');
    const tryAgainBtn = document.getElementById('tryAgainBtn');
    
    // State variables
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let timerInterval;
    let timeRemaining = 0;
    let previousQuestions = [];
    
    // Create or get processing indicator
    const processingIndicator = document.getElementById('processingIndicator') || createProcessingIndicator();
    
    console.log('Test page loaded');
    
    // Check if document content exists in localStorage
    const documentContent = localStorage.getItem('documentContent');
    console.log('Document content retrieved:', documentContent ? 'Yes, length: ' + documentContent.length : 'No');
    
    if (documentContent && documentContent.length > 0) {
        // Show test options
        noDocumentMessage.style.display = 'none';
        testOptions.style.display = 'block';
    }
    
    // Temporarily disable other question types
    if (questionTypeSelect) {
        // Remove all options except MCQ
        while (questionTypeSelect.options.length > 0) {
            questionTypeSelect.remove(0);
        }
        
        // Add only MCQ option
        const mcqOption = document.createElement('option');
        mcqOption.value = 'mcq';
        mcqOption.textContent = 'Multiple Choice';
        questionTypeSelect.appendChild(mcqOption);
    }
    
    // Start test button click handler
    if (startTestBtn) {
        startTestBtn.addEventListener('click', startTest);
    }
    
    // Navigation button click handlers
    if (prevBtn) {
        prevBtn.addEventListener('click', goToPreviousQuestion);
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', goToNextQuestion);
    }
    
    if (submitTestBtn) {
        submitTestBtn.addEventListener('click', submitTest);
    }
    
    // Results button click handlers
    if (retestNewBtn) {
        retestNewBtn.addEventListener('click', () => restartTest(false));
    }
    
    if (retestSameBtn) {
        retestSameBtn.addEventListener('click', () => restartTest(true));
    }
    
    if (downloadResultsBtn) {
        downloadResultsBtn.addEventListener('click', downloadResults);
    }
    
    if (tryAgainBtn) {
        tryAgainBtn.addEventListener('click', () => {
            errorMessage.style.display = 'none';
            testSetup.style.display = 'block';
        });
    }
    
    // Function to start the test
    async function startTest() {
        // Get test options
        const questionType = 'mcq'; // Force MCQ type
        const questionCount = parseInt(questionCountSelect.value);
        const difficultyLevel = difficultyLevelSelect.value;
        const timeLimit = parseInt(timeLimitSelect.value);
        
        // Show processing indicator
        testSetup.style.display = 'none';
        processingIndicator.innerHTML = `
            <div class="spinner"></div>
            <p>Generating questions...</p>
        `;
        processingIndicator.style.display = 'block';
        
        try {
            // Generate questions
            questions = await generateQuestions(questionType, questionCount, difficultyLevel, previousQuestions);
            
            // Initialize user answers
            userAnswers = Array(questions.length).fill(null);
            
            // Set up timer if time limit is set
            if (timeLimit > 0) {
                timeRemaining = timeLimit * 60; // Convert to seconds
                startTimer();
            } else {
                timer.textContent = 'No Time Limit';
            }
            
            // Show first question
            currentQuestionIndex = 0;
            showQuestion(currentQuestionIndex);
            
            // Hide processing indicator and show test
            processingIndicator.style.display = 'none';
            testInProgress.style.display = 'block';
        } catch (error) {
            console.error('Error generating questions:', error);
            
            // Show error message
            processingIndicator.style.display = 'none';
            errorMessage.style.display = 'block';
            document.getElementById('errorText').textContent = `Error generating questions: ${error.message}`;
        }
    }
    
    // Function to generate questions using Gemini API
    async function generateQuestions(type, count, difficulty, previousQuestions = []) {
        const GEMINI_API_KEY = 'AIzaSyBJ-wgdlZ7i4nM_ebgkxbc1u3zC033ctQ4';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const documentContent = localStorage.getItem('documentContent');
        if (!documentContent) {
            throw new Error('No document content found');
        }
        
        // Create a focused prompt for generating MCQ questions
        let promptText = `Generate ${count} ${difficulty} level multiple choice questions based on the following document content. `;
        promptText += 'Create multiple choice questions with 4 options each, clearly indicating the correct answer. ';
        promptText += 'Format the output as a JSON array where each question object includes: question text, type: "mcq", options (array of 4 choices), correct answer, and explanation. ';
        
        if (previousQuestions.length > 0) {
            promptText += 'Avoid generating these previously used questions: ' + JSON.stringify(previousQuestions.map(q => q.question)) + '. ';
        }
        
        promptText += 'Ensure questions cover different concepts and vary in difficulty. ';
        
        const requestData = {
            contents: [{
                parts: [{
                    text: promptText + `\n\nDocument content:\n${documentContent.substring(0, 15000)}`
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
        
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Extract JSON from response
        try {
            // Find JSON array in the response
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const questionsData = JSON.parse(jsonMatch[0]);
                
                // Shuffle the questions
                return shuffleArray(questionsData);
            } else {
                throw new Error('No valid JSON found in response');
            }
        } catch (error) {
            console.error('Error parsing questions JSON:', error);
            throw new Error('Failed to parse questions from API response');
        }
    }
    
    // Function to show a question
    function showQuestion(index) {
        const question = questions[index];
        
        // Update question counter
        questionCounter.textContent = `Question ${index + 1} of ${questions.length}`;
        
        // Update navigation buttons
        prevBtn.disabled = index === 0;
        nextBtn.disabled = false;
        
        // Show submit button on last question
        if (index === questions.length - 1) {
            nextBtn.style.display = 'none';
            submitTestBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitTestBtn.style.display = 'none';
        }
        
        // Create question HTML for MCQ
        let questionHTML = `<div class="question">
            <div class="question-text">${question.question}</div>`;
        
        // Shuffle options if not already shuffled
        if (!question.shuffledOptions) {
            question.shuffledOptions = shuffleArray([...question.options]);
        }
        
        questionHTML += `<div class="options">`;
        
        question.shuffledOptions.forEach((option, optionIndex) => {
            const isSelected = userAnswers[index] === option;
            questionHTML += `
                <div class="option ${isSelected ? 'selected' : ''}" data-value="${option}">
                    <input type="radio" name="q${index}" id="q${index}o${optionIndex}" ${isSelected ? 'checked' : ''}>
                    <label for="q${index}o${optionIndex}">${option}</label>
                </div>
            `;
        });
        
        questionHTML += `</div></div>`;
        
        // Set question HTML
        questionContainer.innerHTML = questionHTML;
        
        // Add event listeners for options
        const options = questionContainer.querySelectorAll('.option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all options
                options.forEach(opt => opt.classList.remove('selected'));
                
                // Add selected class to clicked option
                option.classList.add('selected');
                
                // Update user answer
                userAnswers[currentQuestionIndex] = option.dataset.value;
                
                // Check radio button
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
            });
        });
    }
    
    // Function to go to the previous question
    function goToPreviousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion(currentQuestionIndex);
        }
    }
    
    // Function to go to the next question
    function goToNextQuestion() {
        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            showQuestion(currentQuestionIndex);
        }
    }
    
    // Function to start the timer
    function startTimer() {
        // Clear any existing timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Update timer display
        updateTimerDisplay();
        
        // Start interval
        timerInterval = setInterval(() => {
            timeRemaining--;
            
            if (timeRemaining <= 0) {
                // Time's up, submit the test
                clearInterval(timerInterval);
                submitTest();
            } else {
                updateTimerDisplay();
            }
        }, 1000);
    }
    
    // Function to update timer display
    function updateTimerDisplay() {
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        
        // Format time as MM:SS
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update timer element
        timer.textContent = `Time Remaining: ${formattedTime}`;
        
        // Add warning class when less than 5 minutes remaining
        if (timeRemaining <= 300 && timeRemaining > 60) {
            timer.className = 'timer warning';
        } else if (timeRemaining <= 60) {
            timer.className = 'timer danger';
        } else {
            timer.className = 'timer';
        }
    }
    
    // Function to submit the test
    async function submitTest() {
        // Stop the timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        
        // Hide test in progress
        testInProgress.style.display = 'none';
        
        // Show loading indicator
        loadingIndicator.style.display = 'block';
        
        try {
            // Calculate results
            const results = calculateResults();
            
            // Store previous questions for retest
            previousQuestions = [...questions];
            
            // Display results
            displayResults(results);
            
            // Hide loading indicator and show results
            loadingIndicator.style.display = 'none';
            testResults.style.display = 'block';
        } catch (error) {
            console.error('Error calculating results:', error);
            
            // Show error message
            loadingIndicator.style.display = 'none';
            errorMessage.style.display = 'block';
            document.getElementById('errorText').textContent = `Error calculating results: ${error.message}`;
        }
    }
    
    // Function to calculate results
    function calculateResults() {
        const results = {
            totalQuestions: questions.length,
            correctAnswers: 0,
            incorrectAnswers: 0,
            skippedAnswers: 0,
            scorePercentage: 0,
            detailedResults: []
        };
        
        // Process each question
        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            
            if (!userAnswer) {
                // Question was skipped
                results.skippedAnswers++;
                results.detailedResults.push({
                    question: question.question,
                    userAnswer: 'Skipped',
                    correctAnswer: question.correctAnswer,
                    isCorrect: false,
                    feedback: 'This question was skipped.',
                    type: 'mcq'
                });
            } else if (userAnswer === question.correctAnswer) {
                // Correct answer
                results.correctAnswers++;
                results.detailedResults.push({
                    question: question.question,
                    userAnswer: userAnswer,
                    correctAnswer: question.correctAnswer,
                    isCorrect: true,
                    feedback: question.explanation || 'Correct!',
                    type: 'mcq'
                });
            } else {
                // Incorrect answer
                results.incorrectAnswers++;
                results.detailedResults.push({
                    question: question.question,
                    userAnswer: userAnswer,
                    correctAnswer: question.correctAnswer,
                    isCorrect: false,
                    feedback: question.explanation || `The correct answer is: ${question.correctAnswer}`,
                    type: 'mcq'
                });
            }
        });
        
        // Calculate score percentage
        results.scorePercentage = Math.round((results.correctAnswers / results.totalQuestions) * 100);
        
        return results;
    }
    
    // Function to display results
    function displayResults(results) {
        // Display summary
        resultsSummary.innerHTML = `
            <div class="score">${results.scorePercentage}%</div>
            <p>You answered ${results.correctAnswers} out of ${results.totalQuestions} questions correctly.</p>
            
            <div class="score-details">
                <div class="score-item">
                    <div class="score-label">Correct</div>
                    <div class="score-value">${results.correctAnswers}</div>
                </div>
                <div class="score-item">
                    <div class="score-label">Incorrect</div>
                    <div class="score-value">${results.incorrectAnswers}</div>
                </div>
                <div class="score-item">
                    <div class="score-label">Skipped</div>
                    <div class="score-value">${results.skippedAnswers}</div>
                </div>
            </div>
        `;
        
        // Display detailed results
        let detailedHTML = '';
        
        results.detailedResults.forEach((result, index) => {
            detailedHTML += `
                <div class="result-item ${result.isCorrect ? 'correct' : 'incorrect'}">
                    <div class="result-question">${index + 1}. ${result.question}</div>
                    <div class="result-answer">Your Answer: ${result.userAnswer}</div>
                    <div class="result-correct-answer">Correct Answer: ${result.correctAnswer}</div>
                    <div class="result-feedback">${result.feedback}</div>
                </div>
            `;
        });
        
        resultsDetails.innerHTML = detailedHTML;
    }
    
    // Function to restart the test
    function restartTest(useSameQuestions) {
        // Hide results
        testResults.style.display = 'none';
        
        if (useSameQuestions) {
            // Shuffle the same questions
            questions = shuffleArray([...previousQuestions]);
            
            // For MCQs, reshuffle the options
            questions.forEach(question => {
                delete question.shuffledOptions;
            });
            
            // Reset user answers
            userAnswers = Array(questions.length).fill(null);
            
            // Reset timer if needed
            const timeLimit = parseInt(timeLimitSelect.value);
            if (timeLimit > 0) {
                timeRemaining = timeLimit * 60;
                startTimer();
            } else {
                timer.textContent = 'No Time Limit';
            }
            
            // Show first question
            currentQuestionIndex = 0;
            showQuestion(currentQuestionIndex);
            
            // Show test in progress
            testInProgress.style.display = 'block';
        } else {
            // Go back to test setup
            testSetup.style.display = 'block';
        }
    }
    
    // Function to download results
    function downloadResults() {
        // Create CSV or JSON file with test results
        const format = confirm('Click OK to download as CSV, or Cancel to download as JSON') ? 'csv' : 'json';
        
        if (format === 'csv') {
            downloadCSV();
        } else {
            downloadJSON();
        }
    }
    
    // Function to download results as CSV
    function downloadCSV() {
        // Create CSV content
        let csvContent = 'Question,Your Answer,Correct Answer,Result,Feedback\n';
        
        // Add each result to CSV
        questions.forEach((question, index) => {
            const userAnswer = userAnswers[index] || 'Skipped';
            const result = userAnswer === question.correctAnswer ? 'Correct' : 'Incorrect';
            
            // Escape commas and quotes in text
            const escapedQuestion = `"${question.question.replace(/"/g, '""')}"`;
            const escapedUserAnswer = `"${userAnswer.toString().replace(/"/g, '""')}"`;
            const escapedCorrectAnswer = `"${question.correctAnswer.replace(/"/g, '""')}"`;
            const escapedFeedback = `"${(question.explanation || '').replace(/"/g, '""')}"`;
            
            csvContent += `${escapedQuestion},${escapedUserAnswer},${escapedCorrectAnswer},${result},${escapedFeedback}\n`;
        });
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'test_results.csv';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    // Function to download results as JSON
    function downloadJSON() {
        // Create JSON content
        const jsonContent = {
            testDate: new Date().toISOString(),
            questions: questions.map((question, index) => ({
                question: question.question,
                type: 'mcq',
                userAnswer: userAnswers[index] || 'Skipped',
                correctAnswer: question.correctAnswer,
                isCorrect: (userAnswers[index] || '') === question.correctAnswer,
                explanation: question.explanation || ''
            }))
        };
        
        // Create and download file
        const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'test_results.json';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    // Utility function to shuffle an array
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
    
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
});